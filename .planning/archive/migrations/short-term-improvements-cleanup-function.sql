-- Migration: cleanup_old_invite_codes function
-- Date: 2026-01-27
-- Description: Deletes invite codes expired/used for 14+ days
-- Impact: Automatically removes stale invite codes to keep database clean

CREATE OR REPLACE FUNCTION cleanup_old_invite_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM invite_codes
    WHERE (expires_at < NOW() - INTERVAL '14 days')
       OR (is_used = true AND used_at < NOW() - INTERVAL '14 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION cleanup_old_invite_codes() TO service_role;

-- Migration: check_invite_code_expiration trigger
-- Date: 2026-01-27
-- Description: Auto-flags expired invite codes as revoked on INSERT/UPDATE
-- Impact: Prevents immediate use of already-expired codes
-- Security: SECURITY DEFINER with search_path mitigation

CREATE OR REPLACE FUNCTION check_invite_code_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at < NOW() THEN
    NEW.revoked := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on invite_codes table
DROP TRIGGER IF EXISTS invite_code_expiration_trigger ON invite_codes;

CREATE TRIGGER invite_code_expiration_trigger
BEFORE INSERT OR UPDATE ON invite_codes
FOR EACH ROW
EXECUTE FUNCTION check_invite_code_expiration();
