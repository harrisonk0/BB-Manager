-- ============================================================================
-- RLS Policy Optimization with initPlan Subquery Pattern
-- ============================================================================
-- Purpose: Optimize all RLS policies to use (select auth.uid()) subquery pattern
-- Date: 2026-01-22
-- Context: Phase 2 Plan 01 - Performance Optimization
--
-- This migration wraps volatile function calls (auth.uid(), public.current_app_role())
-- in subqueries to enable PostgreSQL's initPlan optimization, which caches the
-- result instead of calling the function on every row.
--
-- Performance Impact: 10-100x improvement on RLS queries per Supabase benchmarks
--
-- Reference: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
--
-- IMPORTANT: Execute this entire script in one transaction. Each policy is dropped
-- and recreated with the optimized subquery pattern.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create current_app_role() function if not exists
-- ============================================================================
-- This SECURITY DEFINER function allows RLS policies to check the current user's
-- application role while RLS is enabled on user_roles table.
-- SET search_path = public mitigates CVE-2018-1058

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.uid = auth.uid()::text
  LIMIT 1
$$;

-- ============================================================================
-- STEP 2: BOYS table RLS policies (4 policies)
-- ============================================================================

-- Enable RLS on boys table
ALTER TABLE public.boys ENABLE ROW LEVEL SECURITY;

-- Revoke privileges from anon
REVOKE ALL ON TABLE public.boys FROM anon;

-- boys_select_officer_plus
-- Officers and above can SELECT from boys (section is not a security boundary)
DROP POLICY IF EXISTS boys_select_officer_plus ON public.boys;
CREATE POLICY boys_select_officer_plus
ON public.boys
FOR SELECT
TO authenticated
USING ((select public.current_app_role()) IN ('officer','captain','admin'));

-- boys_insert_officer_plus
-- Officers and above can INSERT boys
DROP POLICY IF EXISTS boys_insert_officer_plus ON public.boys;
CREATE POLICY boys_insert_officer_plus
ON public.boys
FOR INSERT
TO authenticated
WITH CHECK ((select public.current_app_role()) IN ('officer','captain','admin'));

-- boys_update_officer_plus
-- Officers and above can UPDATE boys
DROP POLICY IF EXISTS boys_update_officer_plus ON public.boys;
CREATE POLICY boys_update_officer_plus
ON public.boys
FOR UPDATE
TO authenticated
USING ((select public.current_app_role()) IN ('officer','captain','admin'))
WITH CHECK ((select public.current_app_role()) IN ('officer','captain','admin'));

-- boys_delete_officer_plus
-- Officers and above can DELETE boys
DROP POLICY IF EXISTS boys_delete_officer_plus ON public.boys;
CREATE POLICY boys_delete_officer_plus
ON public.boys
FOR DELETE
TO authenticated
USING ((select public.current_app_role()) IN ('officer','captain','admin'));

-- ============================================================================
-- STEP 3: SETTINGS table RLS policies (3 policies)
-- ============================================================================

-- Enable RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Revoke privileges from anon
REVOKE ALL ON TABLE public.settings FROM anon;

-- settings_select_officer_plus
-- All authenticated roles can read settings
DROP POLICY IF EXISTS settings_select_officer_plus ON public.settings;
CREATE POLICY settings_select_officer_plus
ON public.settings
FOR SELECT
TO authenticated
USING ((select public.current_app_role()) IN ('officer','captain','admin'));

-- settings_insert_captain_admin
-- Only Captains and Admins can INSERT settings
DROP POLICY IF EXISTS settings_insert_captain_admin ON public.settings;
CREATE POLICY settings_insert_captain_admin
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK ((select public.current_app_role()) IN ('captain','admin'));

-- settings_update_captain_admin
-- Only Captains and Admins can UPDATE settings
DROP POLICY IF EXISTS settings_update_captain_admin ON public.settings;
CREATE POLICY settings_update_captain_admin
ON public.settings
FOR UPDATE
TO authenticated
USING ((select public.current_app_role()) IN ('captain','admin'))
WITH CHECK ((select public.current_app_role()) IN ('captain','admin'));

-- Note: No DELETE policy on settings - settings should be updated, not deleted

-- ============================================================================
-- STEP 4: USER_ROLES table RLS policies (5 policies)
-- ============================================================================

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Revoke privileges from anon
REVOKE ALL ON TABLE public.user_roles FROM anon;

-- user_roles_select_self_or_manage
-- Users can read their own role; Captains can read Officers; Admins can read Officers/Captains
DROP POLICY IF EXISTS user_roles_select_self_or_manage ON public.user_roles;
CREATE POLICY user_roles_select_self_or_manage
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  uid = (select auth.uid())::text
  OR (
    (select public.current_app_role()) = 'captain'
    AND role = 'officer'
  )
  OR (
    (select public.current_app_role()) = 'admin'
    AND role IN ('officer','captain')
  )
);

-- user_roles_update_captain_manage_officers
-- Captains can UPDATE Officers only
DROP POLICY IF EXISTS user_roles_update_captain_manage_officers ON public.user_roles;
CREATE POLICY user_roles_update_captain_manage_officers
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  (select public.current_app_role()) = 'captain'
  AND role = 'officer'
)
WITH CHECK (role = 'officer');

-- user_roles_update_admin_manage_captain_officer
-- Admins can UPDATE Officers and Captains (not self, to prevent lockout)
DROP POLICY IF EXISTS user_roles_update_admin_manage_captain_officer ON public.user_roles;
CREATE POLICY user_roles_update_admin_manage_captain_officer
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  (select public.current_app_role()) = 'admin'
  AND role IN ('officer','captain')
  AND uid <> (select auth.uid())::text
)
WITH CHECK (role IN ('officer','captain'));

-- user_roles_delete_captain_manage_officers
-- Captains can DELETE Officers only
DROP POLICY IF EXISTS user_roles_delete_captain_manage_officers ON public.user_roles;
CREATE POLICY user_roles_delete_captain_manage_officers
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  (select public.current_app_role()) = 'captain'
  AND role = 'officer'
);

-- user_roles_delete_admin_manage_captain_officer
-- Admins can DELETE Officers and Captains (not self, to prevent lockout)
DROP POLICY IF EXISTS user_roles_delete_admin_manage_captain_officer ON public.user_roles;
CREATE POLICY user_roles_delete_admin_manage_captain_officer
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  (select public.current_app_role()) = 'admin'
  AND role IN ('officer','captain')
  AND uid <> (select auth.uid())::text
);

-- Note: No INSERT policy - role assignment done via claim_invite_code() or manual provisioning

-- ============================================================================
-- STEP 5: INVITE_CODES table RLS policies (3 policies)
-- ============================================================================

-- Enable RLS on invite_codes table
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Revoke privileges from anon
REVOKE ALL ON TABLE public.invite_codes FROM anon;

-- invite_codes_select_manage
-- Admins can see all invites; Captains can only see Officer invites
DROP POLICY IF EXISTS invite_codes_select_manage ON public.invite_codes;
CREATE POLICY invite_codes_select_manage
ON public.invite_codes
FOR SELECT
TO authenticated
USING (
  (select public.current_app_role()) = 'admin'
  OR (
    (select public.current_app_role()) = 'captain'
    AND default_user_role = 'officer'
  )
);

-- invite_codes_insert_manage
-- Captains and Admins can create invites (Captain only for Officers)
DROP POLICY IF EXISTS invite_codes_insert_manage ON public.invite_codes;
CREATE POLICY invite_codes_insert_manage
ON public.invite_codes
FOR INSERT
TO authenticated
WITH CHECK (
  (select public.current_app_role()) IN ('captain','admin')
  AND default_user_role IN ('officer','captain')
  AND NOT revoked
  AND NOT is_used
  AND used_by IS NULL
  AND used_at IS NULL
  AND expires_at > NOW()
  AND expires_at <= NOW() + INTERVAL '7 days'
  AND (
    (select public.current_app_role()) <> 'captain'
    OR default_user_role = 'officer'
  )
);

-- invite_codes_update_manage
-- Admins can update all invites; Captains can update Officer invites only
DROP POLICY IF EXISTS invite_codes_update_manage ON public.invite_codes;
CREATE POLICY invite_codes_update_manage
ON public.invite_codes
FOR UPDATE
TO authenticated
USING (
  (select public.current_app_role()) = 'admin'
  OR (
    (select public.current_app_role()) = 'captain'
    AND default_user_role = 'officer'
  )
)
WITH CHECK (
  default_user_role IN ('officer','captain')
  AND (
    (select public.current_app_role()) <> 'captain'
    OR default_user_role = 'officer'
  )
);

-- ============================================================================
-- STEP 6: AUDIT_LOGS table RLS policy (1 policy)
-- ============================================================================

-- Enable RLS on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Revoke INSERT from anon (already done in Phase 1)
REVOKE INSERT ON TABLE public.audit_logs FROM anon;

-- audit_logs_insert_officer_plus
-- Optimize existing policy with subquery pattern for auth.uid()
-- All authenticated users with a role can INSERT audit logs
-- REVERT_ACTION restricted to admin role only
DROP POLICY IF EXISTS audit_logs_insert_officer_plus ON public.audit_logs;
CREATE POLICY audit_logs_insert_officer_plus
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must have an assigned role (officer, captain, or admin)
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = (select auth.uid())::text
  )
  -- user_email must match authenticated user's email (prevents spoofing)
  AND user_email = coalesce((auth.jwt() ->> 'email'), '')
  -- Timestamp must be within reasonable range (prevent backdated/future logs)
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND created_at <= NOW() + INTERVAL '1 minute'
  -- REVERT_ACTION restricted to admin only
  AND (
    action_type <> 'REVERT_ACTION'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE uid = (select auth.uid())::text
      AND role = 'admin'
    )
  )
);

-- ============================================================================
-- STEP 7: Verification queries
-- ============================================================================

-- Count all RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE 'Total RLS policies in public schema: %', policy_count;
END $$;

-- Verify subquery pattern is being used
DO $$
DECLARE
  optimized_count INTEGER;
  direct_count INTEGER;
BEGIN
  -- Count policies using (select auth.uid()) pattern
  SELECT COUNT(*) INTO optimized_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      qual::text LIKE '%(select auth.uid())%'
      OR with_check::text LIKE '%(select auth.uid())%'
      OR qual::text LIKE '%(select public.current_app_role())%'
      OR with_check::text LIKE '%(select public.current_app_role())%'
    );

  -- Count policies with direct auth.uid() (should be 0 after optimization)
  SELECT COUNT(*) INTO direct_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      qual::text ~ 'auth\.uid\(\)' AND qual::text NOTLIKE '%(select auth.uid())%'
      OR with_check::text ~ 'auth\.uid\(\)' AND with_check::text NOTLIKE '%(select auth.uid())%'
    );

  RAISE NOTICE 'Policies using subquery pattern: %', optimized_count;
  RAISE NOTICE 'Policies with direct auth.uid(): % (should be 0)', direct_count;

  IF direct_count > 0 THEN
    RAISE WARNING 'Some policies still use direct auth.uid() calls';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================
--
-- This migration creates/optimizes 16 RLS policies across 5 tables:
--
-- Table        | Policies | Optimized with (select ...)
-- -------------|----------|------------------------------
-- boys         | 4        | (select public.current_app_role())
-- settings     | 3        | (select public.current_app_role())
-- user_roles   | 5        | (select auth.uid()), (select public.current_app_role())
-- invite_codes | 3        | (select public.current_app_role())
-- audit_logs   | 1        | (select auth.uid())
-- -------------|----------|------------------------------
-- TOTAL        | 16       | All optimized
--
-- Performance improvement: 10-100x on RLS queries per Supabase benchmarks
--
-- ============================================================================
