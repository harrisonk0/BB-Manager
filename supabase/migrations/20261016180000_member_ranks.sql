-- Optional NCO ranks for Company Year 11–14. Rank does not grant any app role.
ALTER TABLE public.members ADD COLUMN rank text;
ALTER TABLE public.archived_members ADD COLUMN rank text;
ALTER TABLE public.members ADD CONSTRAINT members_rank_valid CHECK (
 rank IS NULL OR (rank IN ('lance_corporal','corporal','sergeant','staff_sergeant')
 AND section='company' AND school_year IN ('11','12','13','14'))
);
ALTER TABLE public.archived_members ADD CONSTRAINT archived_members_rank_valid CHECK (
 rank IS NULL OR (rank IN ('lance_corporal','corporal','sergeant','staff_sergeant')
 AND section='company' AND school_year IN ('11','12','13','14'))
);
COMMENT ON COLUMN public.members.rank IS 'Optional NCO rank, Company Year 11+ only. Independent of squad leader and app permissions.';
COMMENT ON COLUMN public.archived_members.rank IS 'Rank at the time this BB year was archived.';

CREATE OR REPLACE FUNCTION public.start_new_bb_session(p_label text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_label text;
  v_email text;
  v_session_id uuid;
  v_member_count integer;
  v_mark_count integer;
  v_closed_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  v_role := public.current_app_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'captain') THEN
    RAISE EXCEPTION 'Only captains and admins can start a new BB session';
  END IF;

  v_label := btrim(coalesce(p_label, ''));
  IF v_label = '' THEN
    RAISE EXCEPTION 'Session label is required';
  END IF;
  IF char_length(v_label) > 80 THEN
    RAISE EXCEPTION 'Session label must be 80 characters or fewer';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('start_new_bb_session'));

  SELECT count(*) INTO v_member_count FROM public.members;
  SELECT count(*) INTO v_mark_count FROM public.marks;

  IF v_member_count = 0 AND v_mark_count = 0 THEN
    RAISE EXCEPTION 'There is no live roster or marks to archive';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  v_closed_at := now();

  INSERT INTO public.bb_sessions (
    label,
    closed_at,
    closed_by,
    closed_by_email,
    member_count,
    mark_count
  )
  VALUES (
    v_label,
    v_closed_at,
    auth.uid(),
    v_email,
    v_member_count,
    v_mark_count
  )
  RETURNING id INTO v_session_id;

  INSERT INTO public.archived_members (
    session_id,
    source_member_id,
    section,
    name,
    squad,
    school_year,
    is_squad_leader,
    rank,
    source_created_at,
    source_updated_at
  )
  SELECT
    v_session_id,
    m.id,
    m.section,
    m.name,
    m.squad,
    m.school_year,
    m.is_squad_leader,
    m.rank,
    m.created_at,
    m.updated_at
  FROM public.members m;

  INSERT INTO public.archived_marks (
    session_id,
    source_mark_id,
    source_member_id,
    section,
    date,
    present,
    score,
    uniform_score,
    behaviour_score,
    created_by,
    source_created_at,
    source_updated_at
  )
  SELECT
    v_session_id,
    mk.id,
    mk.member_id,
    mk.section,
    mk.date,
    mk.present,
    mk.score,
    mk.uniform_score,
    mk.behaviour_score,
    mk.created_by,
    mk.created_at,
    mk.updated_at
  FROM public.marks mk;

  DELETE FROM public.members;

  RETURN jsonb_build_object(
    'id', v_session_id,
    'label', v_label,
    'member_count', v_member_count,
    'mark_count', v_mark_count,
    'closed_at', v_closed_at
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.company_portal_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_is_leader boolean; v_member_rank text; v_result jsonb;
BEGIN
 SELECT a.member_id,m.is_squad_leader,m.rank INTO v_id,v_is_leader,v_member_rank FROM public.portal_accounts a JOIN public.members m ON m.id=a.member_id
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
 'isSquadLeader',v_is_leader,'memberRank',v_member_rank,
 -- Ordinary boys receive no individual statistics about their teammates.
 -- Scope follows the leader's current Company squad, including the leader himself.
 'squadMembers',CASE WHEN v_is_leader THEN coalesce((
  SELECT jsonb_agg(jsonb_build_object(
   'id',mate.id,'name',mate.name,'isSquadLeader',mate.is_squad_leader,'memberRank',mate.rank,
   'marks',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'date',mk.date,'score',CASE WHEN mk.present THEN coalesce(mk.score,0) ELSE -1 END
   ) ORDER BY mk.date DESC)
   FROM public.marks mk WHERE mk.member_id=mate.id AND mk.section='company'),'[]'::jsonb)
  ) ORDER BY lower(mate.name),mate.id)
  FROM public.members mate WHERE mate.section='company' AND mate.squad=r.squad
 ),'[]'::jsonb) ELSE NULL END,
 'marks',coalesce((SELECT jsonb_agg(jsonb_build_object('date',date,'score',CASE WHEN present THEN coalesce(score,0) ELSE -1 END) ORDER BY date DESC)
  FROM public.marks WHERE member_id=v_id AND section='company'),'[]'::jsonb),
 'teammates',coalesce((SELECT jsonb_agg(jsonb_build_object('name',mate.name,'isSquadLeader',mate.is_squad_leader,'memberRank',mate.rank)
  ORDER BY mate.is_squad_leader DESC,lower(mate.name),mate.id)
  FROM public.members mate WHERE mate.section='company' AND mate.squad=r.squad AND mate.id<>v_id),'[]'::jsonb),
 'squads',coalesce((SELECT jsonb_agg(jsonb_build_object('number',sq.squad,'total',sq.total,'attended',sq.attended,'recorded',sq.recorded,
  'label',(SELECT item->>'label' FROM public.settings s,jsonb_array_elements(s.squads) item WHERE s.section='company' AND (item->>'number')::int=sq.squad)) ORDER BY sq.total DESC,sq.squad) FROM squads sq),'[]'::jsonb)) INTO v_result FROM ranked r WHERE r.id=v_id;
 RETURN v_result;
END $$;

