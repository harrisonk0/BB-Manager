-- Enable Row Level Security on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Revoke INSERT privileges from anon (unauthenticated users)
-- Unauthenticated users cannot write audit logs
REVOKE INSERT ON TABLE public.audit_logs FROM anon;

-- audit_logs_insert_officer_plus
-- All authenticated users with a role can INSERT audit logs
-- REVERT_ACTION is restricted to admin role only
-- user_email must match authenticated user's email to prevent impersonation
-- Timestamp must be within reasonable range
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
