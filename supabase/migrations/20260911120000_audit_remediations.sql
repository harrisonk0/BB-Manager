-- Audit remediations (F-02, F-04, F-07, F-11, F-12, F-17, F-23, F-24, F-29).
-- Apply against the hosted project; do not assume a local stack exists.

-- F-07: new Auth users must not receive officer by default.
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, NULL);
  RETURN NEW;
END;
$function$;

-- F-12: staff offboarding should not fail because they recorded marks.
ALTER TABLE public.marks ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_created_by_fkey;
ALTER TABLE public.marks
  ADD CONSTRAINT marks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- F-11: do not rewrite marks.section on conflict; require section to match the member.
CREATE OR REPLACE FUNCTION public.enforce_mark_section()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_member_section public.section;
BEGIN
  SELECT m.section INTO v_member_section
  FROM public.members m
  WHERE m.id = NEW.member_id;

  IF v_member_section IS NULL THEN
    RAISE EXCEPTION 'Member % was not found', NEW.member_id;
  END IF;

  IF NEW.section IS DISTINCT FROM v_member_section THEN
    RAISE EXCEPTION 'Mark section % does not match member section %', NEW.section, v_member_section;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_mark_section ON public.marks;
CREATE TRIGGER trg_enforce_mark_section
  BEFORE INSERT OR UPDATE OF member_id, section
  ON public.marks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_mark_section();

CREATE OR REPLACE FUNCTION public.save_member_marks_patch(
  p_member_id uuid,
  p_section section,
  p_delete_dates date[] DEFAULT '{}'::date[],
  p_upsert_rows jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_invalid_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
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
  ) parsed
  ON CONFLICT (member_id, date) DO UPDATE
  SET
    score = excluded.score,
    uniform_score = excluded.uniform_score,
    behaviour_score = excluded.behaviour_score,
    present = excluded.present,
    updated_at = now()
  WHERE public.marks.section = excluded.section;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_weekly_marks_snapshot(
  p_section section,
  p_meeting_date date,
  p_snapshot jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_invalid_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  WITH parsed AS (
    SELECT
      (entry->>'memberId')::uuid AS member_id,
      entry->'mark' AS mark
    FROM jsonb_array_elements(coalesce(p_snapshot, '[]'::jsonb)) entry
  )
  SELECT count(*)
  INTO v_invalid_member_count
  FROM parsed p
  LEFT JOIN public.members m
    ON m.id = p.member_id
   AND m.section = p_section
  WHERE m.id IS NULL;

  IF v_invalid_member_count > 0 THEN
    RAISE EXCEPTION 'Weekly marks snapshot contains invalid members for section %', p_section;
  END IF;

  WITH parsed AS (
    SELECT
      (entry->>'memberId')::uuid AS member_id,
      entry->'mark' AS mark
    FROM jsonb_array_elements(coalesce(p_snapshot, '[]'::jsonb)) entry
  ), normalized AS (
    SELECT
      p.member_id,
      (p.mark IS NOT NULL AND p.mark <> 'null'::jsonb) AS has_mark
    FROM parsed p
  )
  DELETE FROM public.marks existing
  USING normalized n
  WHERE existing.member_id = n.member_id
    AND existing.section = p_section
    AND existing.date = p_meeting_date
    AND NOT n.has_mark;

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
      (entry->>'memberId')::uuid AS member_id,
      entry->'mark' AS mark
    FROM jsonb_array_elements(coalesce(p_snapshot, '[]'::jsonb)) entry
  ) p
  CROSS JOIN LATERAL (
    SELECT
      (p.mark IS NOT NULL AND p.mark <> 'null'::jsonb) AS has_mark,
      CASE WHEN p.mark IS NOT NULL AND p.mark ? 'score' THEN (p.mark->>'score')::numeric ELSE NULL END AS score,
      CASE WHEN p.mark IS NOT NULL AND p.mark ? 'uniform_score' THEN (p.mark->>'uniform_score')::numeric ELSE NULL END AS uniform_score,
      CASE WHEN p.mark IS NOT NULL AND p.mark ? 'behaviour_score' THEN (p.mark->>'behaviour_score')::numeric ELSE NULL END AS behaviour_score,
      CASE WHEN p.mark IS NOT NULL AND p.mark ? 'present' THEN (p.mark->>'present')::boolean ELSE true END AS present
  ) n
  WHERE n.has_mark
  ON CONFLICT (member_id, date) DO UPDATE
  SET
    score = excluded.score,
    uniform_score = excluded.uniform_score,
    behaviour_score = excluded.behaviour_score,
    present = excluded.present,
    updated_at = now()
  WHERE public.marks.section = excluded.section;
END;
$function$;

-- F-23: reject unknown section names instead of ignoring them.
CREATE OR REPLACE FUNCTION public.can_access_section(user_uid text, section_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    section_name IN ('company', 'junior')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = user_uid::uuid
        AND p.role IN ('admin'::public.app_role, 'captain'::public.app_role, 'officer'::public.app_role)
    );
$function$;

-- F-04: claiming an invite cannot mint admin; captains cannot insert admin codes.
CREATE OR REPLACE FUNCTION public.claim_invite_code(p_code text)
RETURNS TABLE(applied_role text, assigned_section section)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.invite_codes%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.invite_codes WHERE code = p_code FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite code not found';
  END IF;
  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code revoked';
  END IF;
  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code already used';
  END IF;
  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite code expired';
  END IF;
  IF v_invite.role = 'admin'::public.app_role THEN
    RAISE EXCEPTION 'Admin invites cannot be claimed from the client';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.profiles (id, email, role)
  VALUES (auth.uid(), v_email, v_invite.role)
  ON CONFLICT (id) DO UPDATE
    SET role = excluded.role,
        updated_at = now()
    WHERE public.profiles.role IS DISTINCT FROM 'admin'::public.app_role;

  UPDATE public.invite_codes
  SET used_by = auth.uid(),
      used_at = now()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT v_invite.role::text, v_invite.section;
END;
$function$;

DROP POLICY IF EXISTS "Captain and admin can create invite codes" ON public.invite_codes;
CREATE POLICY "Captain and admin can create invite codes"
  ON public.invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      get_my_role() = 'admin'::public.app_role
      AND role = ANY (ARRAY['officer'::public.app_role, 'captain'::public.app_role, 'admin'::public.app_role])
    )
    OR (
      get_my_role() = 'captain'::public.app_role
      AND role = ANY (ARRAY['officer'::public.app_role, 'captain'::public.app_role])
    )
  );

-- F-02 / F-17: stop default PUBLIC/anon table and function privileges.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.members,
  public.marks,
  public.profiles,
  public.settings
TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_member_marks_patch(uuid, public.section, date[], jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_weekly_marks_snapshot(public.section, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- F-24: GraphQL is unused by the SPA.
DO $$
BEGIN
  REVOKE USAGE ON SCHEMA graphql FROM PUBLIC, anon, authenticated;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE USAGE ON SCHEMA graphql_public FROM PUBLIC, anon, authenticated;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- F-29: refresh planner stats so n_live_tup is usable.
ANALYZE public.profiles;
ANALYZE public.settings;
ANALYZE public.members;
ANALYZE public.marks;
ANALYZE public.invite_codes;
ANALYZE public.audit_logs;
