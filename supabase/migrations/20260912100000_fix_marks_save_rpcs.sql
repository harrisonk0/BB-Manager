-- Make weekly/member mark saves reliable for staff who did not create the original row.
-- Invoker RLS plus ON CONFLICT DO UPDATE skipped or rejected updates, which showed up as
-- "Failed to save marks" after a first insert (including iOS double-tap).
-- Apply against the hosted project; do not assume a local stack exists.

CREATE OR REPLACE FUNCTION public.save_member_marks_patch(
  p_member_id uuid,
  p_section section,
  p_delete_dates date[] DEFAULT '{}'::date[],
  p_upsert_rows jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_invalid_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  v_role := public.current_app_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'captain', 'officer') THEN
    RAISE EXCEPTION 'Not authorized to save marks';
  END IF;

  SELECT count(*)
  INTO v_invalid_member_count
  FROM public.members m
  WHERE m.id = p_member_id
    AND m.section = p_section;

  IF v_invalid_member_count = 0 THEN
    RAISE EXCEPTION 'Member % was not found in section %', p_member_id, p_section;
  END IF;

  IF coalesce(array_length(p_delete_dates, 1), 0) > 0 THEN
    DELETE FROM public.marks
    WHERE member_id = p_member_id
      AND section = p_section
      AND date = ANY (p_delete_dates);
  END IF;

  DELETE FROM public.marks existing
  USING jsonb_array_elements(coalesce(p_upsert_rows, '[]'::jsonb)) entry
  WHERE existing.member_id = p_member_id
    AND existing.section = p_section
    AND existing.date = (entry->>'date')::date;

  INSERT INTO public.marks (
    member_id,
    section,
    date,
    score,
    uniform_score,
    behaviour_score,
    present,
    created_by
  )
  SELECT
    p_member_id,
    p_section,
    parsed.date,
    parsed.score,
    parsed.uniform_score,
    parsed.behaviour_score,
    parsed.present,
    auth.uid()
  FROM jsonb_array_elements(coalesce(p_upsert_rows, '[]'::jsonb)) entry
  CROSS JOIN LATERAL (
    SELECT
      (entry->>'date')::date AS date,
      CASE WHEN entry ? 'score' THEN (entry->>'score')::numeric ELSE NULL END AS score,
      CASE WHEN entry ? 'uniform_score' THEN (entry->>'uniform_score')::numeric ELSE NULL END AS uniform_score,
      CASE WHEN entry ? 'behaviour_score' THEN (entry->>'behaviour_score')::numeric ELSE NULL END AS behaviour_score,
      coalesce((entry->>'present')::boolean, true) AS present
  ) parsed;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_weekly_marks_snapshot(
  p_section section,
  p_meeting_date date,
  p_snapshot jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_invalid_member_count integer;
  v_duplicate_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  v_role := public.current_app_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'captain', 'officer') THEN
    RAISE EXCEPTION 'Not authorized to save marks';
  END IF;

  WITH parsed AS (
    SELECT
      (coalesce(entry->>'memberId', entry->>'member_id'))::uuid AS member_id
    FROM jsonb_array_elements(coalesce(p_snapshot, '[]'::jsonb)) entry
  )
  SELECT count(*)
  INTO v_invalid_member_count
  FROM parsed p
  LEFT JOIN public.members m
    ON m.id = p.member_id
   AND m.section = p_section
  WHERE p.member_id IS NULL OR m.id IS NULL;

  IF v_invalid_member_count > 0 THEN
    RAISE EXCEPTION 'Weekly marks snapshot contains invalid members for section %', p_section;
  END IF;

  WITH parsed AS (
    SELECT
      (coalesce(entry->>'memberId', entry->>'member_id'))::uuid AS member_id
    FROM jsonb_array_elements(coalesce(p_snapshot, '[]'::jsonb)) entry
  )
  SELECT count(*) - count(DISTINCT member_id)
  INTO v_duplicate_member_count
  FROM parsed;

  IF v_duplicate_member_count > 0 THEN
    RAISE EXCEPTION 'Weekly marks snapshot contains duplicate members';
  END IF;

  WITH parsed AS (
    SELECT
      (coalesce(entry->>'memberId', entry->>'member_id'))::uuid AS member_id
    FROM jsonb_array_elements(coalesce(p_snapshot, '[]'::jsonb)) entry
  )
  DELETE FROM public.marks existing
  USING parsed p
  WHERE existing.member_id = p.member_id
    AND existing.section = p_section
    AND existing.date = p_meeting_date;

  INSERT INTO public.marks (
    member_id,
    section,
    date,
    score,
    uniform_score,
    behaviour_score,
    present,
    created_by
  )
  SELECT
    p.member_id,
    p_section,
    p_meeting_date,
    n.score,
    n.uniform_score,
    n.behaviour_score,
    n.present,
    auth.uid()
  FROM (
    SELECT
      (coalesce(entry->>'memberId', entry->>'member_id'))::uuid AS member_id,
      entry->'mark' AS mark
    FROM jsonb_array_elements(coalesce(p_snapshot, '[]'::jsonb)) entry
  ) p
  CROSS JOIN LATERAL (
    SELECT
      (jsonb_typeof(p.mark) = 'object') AS has_mark,
      CASE WHEN jsonb_typeof(p.mark) = 'object' AND p.mark ? 'score' THEN (p.mark->>'score')::numeric ELSE NULL END AS score,
      CASE WHEN jsonb_typeof(p.mark) = 'object' AND p.mark ? 'uniform_score' THEN (p.mark->>'uniform_score')::numeric ELSE NULL END AS uniform_score,
      CASE WHEN jsonb_typeof(p.mark) = 'object' AND p.mark ? 'behaviour_score' THEN (p.mark->>'behaviour_score')::numeric ELSE NULL END AS behaviour_score,
      CASE
        WHEN jsonb_typeof(p.mark) = 'object' AND p.mark ? 'present' THEN (p.mark->>'present')::boolean
        ELSE true
      END AS present
  ) n
  WHERE n.has_mark;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_member_marks_patch(uuid, public.section, date[], jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_weekly_marks_snapshot(public.section, date, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_member_marks_patch(uuid, public.section, date[], jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_weekly_marks_snapshot(public.section, date, jsonb) TO authenticated;

GRANT ALL ON FUNCTION public.save_member_marks_patch(uuid, public.section, date[], jsonb) TO postgres, service_role;
GRANT ALL ON FUNCTION public.save_weekly_marks_snapshot(public.section, date, jsonb) TO postgres, service_role;
