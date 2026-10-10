-- Run as database owner through the Management API. All fixtures roll back.
BEGIN;
CREATE TEMP TABLE portal_fixture AS SELECT gen_random_uuid() AS staff_id,gen_random_uuid() AS boy_id,
 gen_random_uuid() AS pending_id,gen_random_uuid() AS member_id,gen_random_uuid() AS pending_member_id;
GRANT SELECT ON portal_fixture TO authenticated;
INSERT INTO auth.users(id,email,email_confirmed_at,aud,role)
 SELECT staff_id,'portal-test-staff-'||staff_id||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM portal_fixture
 UNION ALL SELECT boy_id,'portal-test-boy-'||boy_id||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM portal_fixture
 UNION ALL SELECT pending_id,'portal-test-pending-'||pending_id||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM portal_fixture;
UPDATE public.profiles SET role='officer' WHERE id=(SELECT staff_id FROM portal_fixture);
INSERT INTO public.members(id,name,section,squad,school_year)
 SELECT member_id,'PORTAL SQL Boy','company'::public.section,1,'10' FROM portal_fixture
 UNION ALL SELECT pending_member_id,'PORTAL SQL Pending','company'::public.section,2,'11' FROM portal_fixture;
INSERT INTO public.portal_accounts(member_id,user_id,username,activated_at)
 SELECT member_id,boy_id,'test.'||replace(member_id::text,'-',''),now() FROM portal_fixture
 UNION ALL SELECT pending_member_id,pending_id,'test.'||replace(pending_member_id::text,'-',''),NULL FROM portal_fixture;
INSERT INTO public.marks(member_id,section,date,present,score,created_by)
 SELECT member_id,'company'::public.section,'2026-10-01'::date,true,0,staff_id FROM portal_fixture
 UNION ALL SELECT member_id,'company'::public.section,'2026-10-02'::date,true,5,staff_id FROM portal_fixture
 UNION ALL SELECT member_id,'company'::public.section,'2026-10-03'::date,false,NULL,staff_id FROM portal_fixture;
SELECT set_config('request.jwt.claim.sub',(SELECT boy_id::text FROM portal_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE s jsonb;
BEGIN
 IF NOT public.is_portal_member() OR public.is_portal_staff() THEN RAISE EXCEPTION 'Wrong portal role'; END IF;
 IF (SELECT count(*) FROM public.portal_accounts)<>1 THEN RAISE EXCEPTION 'Account isolation failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.members) OR EXISTS(SELECT 1 FROM public.marks) OR EXISTS(SELECT 1 FROM public.archived_members) THEN RAISE EXCEPTION 'Roster data leaked'; END IF;
 IF has_column_privilege('authenticated','public.portal_accounts','code_hash','SELECT') THEN RAISE EXCEPTION 'Setup hashes exposed'; END IF;
 IF has_function_privilege('authenticated','public.portal_complete_setup(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Activation RPC exposed'; END IF;
 s=public.company_portal_summary();
 IF s->>'name'<>'PORTAL SQL Boy' OR (s->>'total')::numeric<>5 OR (s->>'attended')::int<>2 OR (s->>'recorded')::int<>3 OR jsonb_array_length(s->'marks')<>3 THEN RAISE EXCEPTION 'Personal summary wrong: %',s; END IF;
 IF s::text LIKE '%PORTAL SQL Pending%' THEN RAISE EXCEPTION 'Other boy name leaked'; END IF;
 BEGIN
  PERFORM public.save_company_event(NULL,0,'Forbidden','2029-10-01T19:00','2029-10-01T21:00','','',false);
  RAISE EXCEPTION 'Boy could write events';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Staff access required' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT pending_id::text FROM portal_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.is_portal_member() THEN RAISE EXCEPTION 'Pending account got active access'; END IF;
 IF EXISTS(SELECT 1 FROM public.company_events) THEN RAISE EXCEPTION 'Pending account read events'; END IF;
 BEGIN PERFORM public.company_portal_summary(); RAISE EXCEPTION 'Pending account read stats';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Portal access required' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT staff_id::text FROM portal_fixture),true);
SET LOCAL ROLE authenticated;
INSERT INTO public.company_calendar_settings(id,starts_on,ends_on,starts_at,ends_at,location)
 VALUES(true,'2029-10-01','2029-10-31','19:00','21:00','Test Hall') ON CONFLICT(id) DO UPDATE SET starts_on=excluded.starts_on,ends_on=excluded.ends_on,starts_at=excluded.starts_at,ends_at=excluded.ends_at;
DO $$ DECLARE n integer; expected integer; chosen uuid;
BEGIN
 IF NOT public.is_portal_staff() THEN RAISE EXCEPTION 'Officer access missing'; END IF;
 SELECT count(*) INTO expected FROM generate_series('2029-10-01'::date,'2029-10-31'::date,interval '1 day') d
 WHERE extract(dow FROM d)=(SELECT meeting_day FROM public.settings WHERE section='company');
 n=public.generate_company_nights(); IF n<>expected THEN RAISE EXCEPTION 'Generated % nights; expected %',n,expected; END IF;
 SELECT id INTO chosen FROM public.company_events WHERE meeting_date BETWEEN '2029-10-01' AND '2029-10-31' LIMIT 1;
 UPDATE public.company_events SET cancelled=true,title='Edited weekly night' WHERE id=chosen;
 IF public.generate_company_nights()<>0 THEN RAISE EXCEPTION 'Generated duplicates'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.company_events WHERE id=chosen AND cancelled AND title='Edited weekly night') THEN RAISE EXCEPTION 'Generation overwrote exception'; END IF;
 IF EXISTS(SELECT 1 FROM public.company_events WHERE meeting_date BETWEEN '2029-10-01' AND '2029-10-31' AND extract(hour FROM starts_at AT TIME ZONE 'Europe/London')<>19) THEN RAISE EXCEPTION 'London start time changed across DST'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
