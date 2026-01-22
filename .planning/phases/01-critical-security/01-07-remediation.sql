-- ============================================================================
-- Audit Logs RLS Policy Remediation
-- ============================================================================
-- Purpose: Close security gap for audit_logs INSERT policy
-- Date: 2026-01-22
-- Context: Phase 1 Plan 07 - Apply migration 20250122085026_audit_logs_rls.sql
--
-- This script should be executed via:
-- 1. Supabase Dashboard > SQL Editor
-- 2. MCP Supabase tool: mcp__supabase__executeSQL
-- 3. Any PostgreSQL client connected to the database
--
-- IMPORTANT: Execute this entire script in one transaction to ensure
-- the permissive policy is dropped before creating the secure one.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Verify current state (for documentation)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  policy_count INTEGER;
  policy_name TEXT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'audit_logs'
    AND cmd = 'INSERT';

  RAISE NOTICE 'Current audit_logs INSERT policies: %', policy_count;

  IF policy_count > 0 THEN
    SELECT policyname INTO policy_name
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND cmd = 'INSERT'
    LIMIT 1;

    RAISE NOTICE 'Existing policy name: %', policy_name;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Drop existing permissive policy
-- ----------------------------------------------------------------------------
-- The UAT test found policy "audit_logs_insert" with with_check=true
-- This permissive policy must be dropped before applying the secure one
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;

-- Also drop any other variations that might exist
DROP POLICY IF EXISTS audit_logs_insert_officer_plus ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_authenticated ON public.audit_logs;

-- ----------------------------------------------------------------------------
-- STEP 3: Enable Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- STEP 4: Revoke INSERT privileges from anon
-- ----------------------------------------------------------------------------
-- Unauthenticated users cannot write audit logs
REVOKE INSERT ON TABLE public.audit_logs FROM anon;

-- ----------------------------------------------------------------------------
-- STEP 5: Create secure INSERT policy
-- ----------------------------------------------------------------------------
-- Policy: audit_logs_insert_officer_plus
-- Purpose: All authenticated users with a role can INSERT audit logs
-- Security controls:
--   1. User must have an assigned role (officer, captain, or admin)
--   2. user_email must match authenticated user's email (prevents spoofing)
--   3. Timestamp must be within reasonable range (prevent backdated/future logs)
--   4. REVERT_ACTION restricted to admin role only
CREATE POLICY audit_logs_insert_officer_plus
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must have an assigned role (officer, captain, or admin)
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = auth.uid()::text
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
      WHERE uid = auth.uid()::text
      AND role = 'admin'
    )
  )
);

-- ----------------------------------------------------------------------------
-- STEP 6: Verify the new policy was created
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  new_policy RECORD;
BEGIN
  FOR new_policy IN
    SELECT policyname, permissive, roles, cmd,
           pg_get_expr(qual, policy tablename) as qual_expr,
           pg_get_expr(with_check, policy tablename) as with_check_expr
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND cmd = 'INSERT'
  LOOP
    RAISE NOTICE 'Created policy: %', new_policy.policyname;
    RAISE NOTICE '  Permissive: %', new_policy.permissive;
    RAISE NOTICE '  Roles: %', new_policy.roles;
    RAISE NOTICE '  Command: %', new_policy.cmd;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these after the script to confirm success:

-- 1. Check that the secure policy exists
-- SELECT policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'audit_logs' AND cmd = 'INSERT';
--
-- Expected: 1 row with policyname='audit_logs_insert_officer_plus'

-- 2. Verify RLS is enabled
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname = 'audit_logs';
--
-- Expected: relrowsecurity = true

-- 3. Check the policy has complex WITH CHECK clause (not just "true")
-- SELECT length(with_check::text) as policy_complexity
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'audit_logs' AND cmd = 'INSERT';
--
-- Expected: policy_complexity > 100 (complex expression)
