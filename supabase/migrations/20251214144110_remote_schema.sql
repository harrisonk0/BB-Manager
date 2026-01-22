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
