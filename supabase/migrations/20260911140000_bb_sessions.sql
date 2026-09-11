-- Archive the live Company and Junior rosters into a named BB session,
-- then empty members/marks so staff can start a new year.
-- Meeting-day settings, profiles, and previous archives are left untouched.
-- Apply against the hosted project; do not assume a local stack exists.

CREATE TABLE IF NOT EXISTS public.bb_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  closed_by_email text,
  member_count integer NOT NULL DEFAULT 0,
  mark_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bb_sessions_label_length CHECK (char_length(btrim(label)) BETWEEN 1 AND 80)
);

CREATE TABLE IF NOT EXISTS public.archived_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.bb_sessions (id) ON DELETE CASCADE,
  source_member_id uuid NOT NULL,
  section public.section NOT NULL,
  name text NOT NULL,
  squad smallint NOT NULL,
  school_year text NOT NULL,
  is_squad_leader boolean NOT NULL DEFAULT false,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  CONSTRAINT archived_members_session_source UNIQUE (session_id, source_member_id)
);

CREATE TABLE IF NOT EXISTS public.archived_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.bb_sessions (id) ON DELETE CASCADE,
  source_mark_id uuid NOT NULL,
  source_member_id uuid NOT NULL,
  section public.section NOT NULL,
  date date NOT NULL,
  present boolean NOT NULL,
  score numeric,
  uniform_score numeric,
  behaviour_score numeric,
  created_by uuid,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  CONSTRAINT archived_marks_session_source UNIQUE (session_id, source_mark_id)
);

CREATE INDEX IF NOT EXISTS archived_members_session_section_idx
  ON public.archived_members (session_id, section);

CREATE INDEX IF NOT EXISTS archived_marks_session_member_idx
  ON public.archived_marks (session_id, source_member_id);

CREATE INDEX IF NOT EXISTS bb_sessions_closed_at_idx
  ON public.bb_sessions (closed_at DESC);

COMMENT ON TABLE public.bb_sessions IS 'Closed BB years. Live members/marks are copied here, then deleted from the working tables.';
COMMENT ON TABLE public.archived_members IS 'Read-only member snapshots belonging to a closed bb_sessions row.';
COMMENT ON TABLE public.archived_marks IS 'Read-only mark snapshots belonging to a closed bb_sessions row.';

ALTER TABLE public.bb_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App users can view bb sessions" ON public.bb_sessions;
CREATE POLICY "App users can view bb sessions"
  ON public.bb_sessions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT current_app_role() AS current_app_role) = ANY (ARRAY['admin'::text, 'captain'::text, 'officer'::text])
  );

DROP POLICY IF EXISTS "App users can view archived members" ON public.archived_members;
CREATE POLICY "App users can view archived members"
  ON public.archived_members
  FOR SELECT
  TO authenticated
  USING (
    (SELECT current_app_role() AS current_app_role) = ANY (ARRAY['admin'::text, 'captain'::text, 'officer'::text])
  );

DROP POLICY IF EXISTS "App users can view archived marks" ON public.archived_marks;
CREATE POLICY "App users can view archived marks"
  ON public.archived_marks
  FOR SELECT
  TO authenticated
  USING (
    (SELECT current_app_role() AS current_app_role) = ANY (ARRAY['admin'::text, 'captain'::text, 'officer'::text])
  );

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

COMMENT ON FUNCTION public.start_new_bb_session(text) IS
  'Captains and admins only. Copies live members and marks into archive tables, then deletes the live roster for both sections.';

REVOKE ALL ON TABLE public.bb_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.archived_members FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.archived_marks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_new_bb_session(text) FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.bb_sessions, public.archived_members, public.archived_marks TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_new_bb_session(text) TO authenticated;

GRANT ALL ON TABLE public.bb_sessions, public.archived_members, public.archived_marks TO postgres, service_role;
GRANT ALL ON FUNCTION public.start_new_bb_session(text) TO postgres, service_role;
