BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE FUNCTION public.dispatch_portal_push_job() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_secret text;
BEGIN
 SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='portal_push_worker';
 IF v_secret IS NULL THEN RAISE EXCEPTION 'Portal push worker credential not configured'; END IF;
 PERFORM net.http_post(
  url:='https://smjictierxsqgdmwobrj.supabase.co/functions/v1/company-portal',
  headers:=jsonb_build_object('Content-Type','application/json','x-portal-worker',v_secret),
  body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=10000);
END $$;
REVOKE ALL ON FUNCTION public.dispatch_portal_push_job() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_portal_push_job() TO service_role;
SELECT cron.schedule('bb-portal-push','* * * * *','SELECT public.dispatch_portal_push_job()');
SELECT cron.schedule('bb-portal-cleanup','15 3 * * *',
 $$DELETE FROM public.portal_attempts WHERE window_start < now()-interval '2 days';
   DELETE FROM public.portal_notifications WHERE created_at < now()-interval '30 days';$$);
COMMIT;
