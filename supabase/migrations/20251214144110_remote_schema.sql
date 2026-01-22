-- Security Functions with Hardened search_path
-- These functions mitigate CVE-2018-1058 by explicitly setting search_path

-- Get user role by UID with hardened search_path
-- SECURITY DEFINER allows reading user_roles even when RLS is enabled
-- SET search_path = public mitigates CVE-2018-1058
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE uid = user_uid LIMIT 1;
$$;

-- Check if user can access a section (all authenticated users can access both sections per security model)
-- Section is contextual, not a security boundary
-- SET search_path = public mitigates CVE-2018-1058
CREATE OR REPLACE FUNCTION public.can_access_section(user_uid text, section_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = user_uid
  ) AS has_role;
$$;

-- Check if user can access audit logs (Captain and Admin only per security model)
-- SET search_path = public mitigates CVE-2018-1058
CREATE OR REPLACE FUNCTION public.can_access_audit_logs(user_uid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = user_uid
    AND role IN ('captain', 'admin')
  );
$$;
