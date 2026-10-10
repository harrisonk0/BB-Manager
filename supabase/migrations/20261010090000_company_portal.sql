BEGIN;
-- Company portal identities never acquire a staff role in profiles.
CREATE TABLE public.portal_accounts (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  username text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
  code_hash text,
  code_fingerprint text UNIQUE,
  activated_at timestamptz,
  feed_hash text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.portal_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.company_calendar_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  location text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'Europe/London' CHECK (timezone = 'Europe/London'),
  CHECK (ends_on >= starts_on AND ends_on - starts_on <= 370),
  CHECK (ends_at > starts_at)
);
CREATE TABLE public.company_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text NOT NULL DEFAULT '' CHECK (length(location) <= 500),
  details text NOT NULL DEFAULT '' CHECK (length(details) <= 10000),
  cancelled boolean NOT NULL DEFAULT false,
  meeting_date date UNIQUE,
  revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE TABLE public.portal_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.portal_push_deliveries (
  notification_id uuid NOT NULL REFERENCES public.portal_notifications(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.portal_push_subscriptions(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  delivered_at timestamptz,
  PRIMARY KEY (notification_id, subscription_id)
);

CREATE FUNCTION public.is_portal_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce(public.current_app_role() IN ('admin','captain','officer'),false);
$$;
CREATE FUNCTION public.is_portal_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.portal_accounts a JOIN public.members m ON m.id=a.member_id
 WHERE a.user_id=auth.uid() AND a.activated_at IS NOT NULL AND m.section='company');
$$;
ALTER TABLE public.portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_accounts,public.portal_attempts,public.company_calendar_settings,public.company_events,
 public.portal_push_subscriptions,public.portal_notifications,public.portal_push_deliveries FROM anon,authenticated;
GRANT SELECT (member_id,user_id,username,activated_at,created_at) ON public.portal_accounts TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.company_calendar_settings,public.company_events TO authenticated;
GRANT ALL ON public.portal_accounts,public.portal_attempts,public.company_calendar_settings,public.company_events,
 public.portal_push_subscriptions,public.portal_notifications,public.portal_push_deliveries TO service_role;
CREATE POLICY "Portal identities readable by owner or staff" ON public.portal_accounts FOR SELECT TO authenticated
 USING (user_id=auth.uid() OR public.is_portal_staff());
CREATE POLICY "Calendar visible to staff and active Company boys" ON public.company_events FOR SELECT TO authenticated
 USING (public.is_portal_staff() OR public.is_portal_member());
CREATE POLICY "Staff insert events" ON public.company_events FOR INSERT TO authenticated WITH CHECK (public.is_portal_staff());
CREATE POLICY "Staff update events" ON public.company_events FOR UPDATE TO authenticated USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());
CREATE POLICY "Staff read calendar settings" ON public.company_calendar_settings FOR SELECT TO authenticated USING (public.is_portal_staff());
CREATE POLICY "Staff insert calendar settings" ON public.company_calendar_settings FOR INSERT TO authenticated WITH CHECK (public.is_portal_staff());
CREATE POLICY "Staff update calendar settings" ON public.company_calendar_settings FOR UPDATE TO authenticated USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

CREATE FUNCTION public.portal_account_company_only() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.members WHERE id=NEW.member_id AND section='company') THEN
  RAISE EXCEPTION 'Portal access is for Company Section only';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_account_company_only BEFORE INSERT OR UPDATE ON public.portal_accounts FOR EACH ROW EXECUTE FUNCTION public.portal_account_company_only();
CREATE FUNCTION public.remove_portal_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid;
BEGIN
 IF TG_OP='DELETE' OR NEW.section <> 'company' THEN
  SELECT user_id INTO v_user FROM public.portal_accounts WHERE member_id=OLD.id;
  DELETE FROM auth.users WHERE id=v_user;
  DELETE FROM public.portal_accounts WHERE member_id=OLD.id;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER remove_portal_identity BEFORE DELETE OR UPDATE OF section ON public.members FOR EACH ROW EXECUTE FUNCTION public.remove_portal_identity();

-- Counters are committed even for invalid attempts (no exception on a wrong code).
CREATE FUNCTION public.portal_check_code(p_username text,p_code text,p_ip_key text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_key text; v_count integer; v_user uuid;
BEGIN
 FOREACH v_key IN ARRAY ARRAY['ip:'||p_ip_key,'user:'||lower(p_username)] LOOP
  INSERT INTO public.portal_attempts(key,attempts) VALUES(v_key,1)
  ON CONFLICT(key) DO UPDATE SET
   attempts=CASE WHEN portal_attempts.window_start < now()-interval '1 hour' THEN 1 ELSE portal_attempts.attempts+1 END,
   window_start=CASE WHEN portal_attempts.window_start < now()-interval '1 hour' THEN now() ELSE portal_attempts.window_start END
  RETURNING attempts INTO v_count;
  IF v_count > (CASE WHEN v_key LIKE 'ip:%' THEN 30 ELSE 5 END) THEN RETURN NULL; END IF;
 END LOOP;
 SELECT a.user_id INTO v_user FROM public.portal_accounts a JOIN public.members m ON m.id=a.member_id
 WHERE a.username=lower(p_username) AND a.activated_at IS NULL AND a.code_hash IS NOT NULL
 AND a.code_hash=extensions.crypt(upper(p_code),a.code_hash) AND m.section='company';
 RETURN v_user;
END $$;
CREATE FUNCTION public.portal_issue_code(p_member_id uuid,p_user_id uuid,p_username text,p_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_previous uuid;
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_member_id::text,0));
 SELECT user_id INTO v_previous FROM public.portal_accounts WHERE member_id=p_member_id;
 INSERT INTO public.portal_accounts(member_id,user_id,username,code_hash,code_fingerprint) VALUES
 (p_member_id,p_user_id,p_username,extensions.crypt(p_code,extensions.gen_salt('bf',10)),encode(extensions.digest(p_code,'sha256'),'hex'))
 ON CONFLICT(member_id) DO UPDATE SET user_id=excluded.user_id,code_hash=excluded.code_hash,code_fingerprint=excluded.code_fingerprint,activated_at=NULL,feed_hash=NULL;
 RETURN v_previous;
END $$;
CREATE FUNCTION public.portal_complete_setup(p_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.webauthn_credentials WHERE user_id=p_user_id) THEN RETURN false; END IF;
 UPDATE public.portal_accounts SET activated_at=coalesce(activated_at,now()),code_hash=NULL,code_fingerprint=NULL WHERE user_id=p_user_id;
 RETURN FOUND;
END $$;

CREATE FUNCTION public.company_portal_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_result jsonb;
BEGIN
 SELECT a.member_id INTO v_id FROM public.portal_accounts a JOIN public.members m ON m.id=a.member_id
 WHERE a.user_id=auth.uid() AND a.activated_at IS NOT NULL AND m.section='company';
 IF v_id IS NULL THEN RAISE EXCEPTION 'Portal access required'; END IF;
 WITH totals AS (
  SELECT m.id,m.name,m.squad,coalesce(sum(CASE WHEN mk.present THEN coalesce(mk.score,0) ELSE 0 END),0) AS total,
   count(mk.id) FILTER(WHERE mk.present) AS attended,count(mk.id) AS recorded
  FROM public.members m LEFT JOIN public.marks mk ON mk.member_id=m.id AND mk.section='company'
  WHERE m.section='company' GROUP BY m.id,m.name,m.squad
 ), ranked AS (
  SELECT *,rank() OVER(ORDER BY total DESC) AS company_rank,rank() OVER(PARTITION BY squad ORDER BY total DESC) AS squad_rank FROM totals
 ), squads AS (
  SELECT squad,sum(total) AS total,sum(attended) AS attended,sum(recorded) AS recorded FROM totals GROUP BY squad
 )
 SELECT jsonb_build_object('name',r.name,'squad',r.squad,'total',r.total,'attended',r.attended,'recorded',r.recorded,
 'companyRank',r.company_rank,'squadRank',r.squad_rank,
 'marks',coalesce((SELECT jsonb_agg(jsonb_build_object('date',date,'score',CASE WHEN present THEN coalesce(score,0) ELSE -1 END) ORDER BY date DESC)
  FROM public.marks WHERE member_id=v_id AND section='company'),'[]'::jsonb),
 'squads',coalesce((SELECT jsonb_agg(jsonb_build_object('number',sq.squad,'total',sq.total,'attended',sq.attended,'recorded',sq.recorded,
  'label',(SELECT item->>'label' FROM public.settings s,jsonb_array_elements(s.squads) item WHERE s.section='company' AND (item->>'number')::int=sq.squad)) ORDER BY sq.total DESC,sq.squad) FROM squads sq),'[]'::jsonb)) INTO v_result FROM ranked r WHERE r.id=v_id;
 RETURN v_result;
END $$;

CREATE FUNCTION public.generate_company_nights() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cfg public.company_calendar_settings; v_day integer; v_count integer;
BEGIN
 IF NOT public.is_portal_staff() THEN RAISE EXCEPTION 'Staff access required'; END IF;
 SELECT * INTO cfg FROM public.company_calendar_settings WHERE id=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'Set the BB year dates and times first'; END IF;
 SELECT meeting_day INTO v_day FROM public.settings WHERE section='company';
 INSERT INTO public.company_events(title,starts_at,ends_at,location,meeting_date)
 SELECT 'Company night',(d::date+cfg.starts_at) AT TIME ZONE cfg.timezone,(d::date+cfg.ends_at) AT TIME ZONE cfg.timezone,cfg.location,d::date
 FROM generate_series(cfg.starts_on::timestamp,cfg.ends_on::timestamp,interval '1 day') d
 WHERE extract(dow FROM d)=v_day ON CONFLICT(meeting_date) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $$;

CREATE FUNCTION public.save_company_event(p_id uuid,p_revision integer,p_title text,p_starts_local text,p_ends_local text,p_location text,p_details text,p_cancelled boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT public.is_portal_staff() THEN RAISE EXCEPTION 'Staff access required'; END IF;
 IF p_starts_local !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$' OR p_ends_local !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$' THEN RAISE EXCEPTION 'Invalid event date/time'; END IF;
 IF p_id IS NULL THEN
  INSERT INTO public.company_events(title,starts_at,ends_at,location,details,cancelled)
  VALUES(trim(p_title),p_starts_local::timestamp AT TIME ZONE 'Europe/London',p_ends_local::timestamp AT TIME ZONE 'Europe/London',p_location,p_details,p_cancelled) RETURNING id INTO v_id;
 ELSE
  UPDATE public.company_events SET title=trim(p_title),starts_at=p_starts_local::timestamp AT TIME ZONE 'Europe/London',ends_at=p_ends_local::timestamp AT TIME ZONE 'Europe/London',location=p_location,details=p_details,cancelled=p_cancelled
  WHERE id=p_id AND revision=p_revision RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'This event changed. Reload it before saving.'; END IF;
 END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.save_company_event(uuid,integer,text,text,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_company_event(uuid,integer,text,text,text,text,text,boolean) TO authenticated;

CREATE FUNCTION public.company_event_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 NEW.revision=OLD.revision+1; NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER company_event_revision BEFORE UPDATE ON public.company_events FOR EACH ROW EXECUTE FUNCTION public.company_event_changed();
CREATE FUNCTION public.queue_company_event_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_action text;
BEGIN
 IF TG_OP='INSERT' OR NEW.cancelled IS DISTINCT FROM OLD.cancelled OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
 OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.location IS DISTINCT FROM OLD.location THEN
  v_action=CASE WHEN NEW.cancelled THEN 'Cancelled' WHEN TG_OP='INSERT' THEN 'New event' ELSE 'Event updated' END;
  INSERT INTO public.portal_notifications(event_id,title,body) VALUES(NEW.id,v_action||': '||NEW.title,
   to_char(NEW.starts_at AT TIME ZONE 'Europe/London','Dy DD Mon, HH24:MI')||CASE WHEN NEW.location='' THEN '' ELSE ' · '||NEW.location END) RETURNING id INTO v_id;
  INSERT INTO public.portal_push_deliveries(notification_id,subscription_id)
   SELECT v_id,s.id FROM public.portal_push_subscriptions s JOIN public.portal_accounts a ON a.user_id=s.user_id
   WHERE a.activated_at IS NOT NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER queue_company_event_push AFTER INSERT OR UPDATE ON public.company_events FOR EACH ROW EXECUTE FUNCTION public.queue_company_event_push();
CREATE FUNCTION public.claim_portal_push() RETURNS TABLE(notification_id uuid,subscription_id uuid,title text,body text,subscription jsonb)
 LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH candidates AS (
  SELECT d.notification_id,d.subscription_id FROM public.portal_push_deliveries d WHERE d.delivered_at IS NULL AND d.attempts<5
  AND d.next_attempt_at<=now() AND (d.lease_until IS NULL OR d.lease_until<now()) ORDER BY d.next_attempt_at LIMIT 100 FOR UPDATE SKIP LOCKED
 ), claimed AS (
  UPDATE public.portal_push_deliveries d SET lease_until=now()+interval '2 minutes',attempts=d.attempts+1
  FROM candidates c WHERE d.notification_id=c.notification_id AND d.subscription_id=c.subscription_id RETURNING d.notification_id,d.subscription_id
 ) SELECT c.notification_id,c.subscription_id,n.title,n.body,s.subscription FROM claimed c
 JOIN public.portal_notifications n ON n.id=c.notification_id JOIN public.portal_push_subscriptions s ON s.id=c.subscription_id;
$$;
-- No anonymous access and no client execution of credential/outbox functions.
REVOKE ALL ON FUNCTION public.portal_account_company_only(),public.remove_portal_identity(),public.portal_check_code(text,text,text),
 public.portal_issue_code(uuid,uuid,text,text),public.portal_complete_setup(uuid),public.company_event_changed(),public.queue_company_event_push(),public.claim_portal_push() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portal_check_code(text,text,text),public.portal_issue_code(uuid,uuid,text,text),public.portal_complete_setup(uuid),public.claim_portal_push() TO service_role;
REVOKE ALL ON FUNCTION public.is_portal_staff(),public.is_portal_member(),public.company_portal_summary(),public.generate_company_nights() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_portal_staff(),public.is_portal_member(),public.company_portal_summary(),public.generate_company_nights() TO authenticated,service_role;
COMMIT;
