BEGIN;
CREATE OR REPLACE FUNCTION public.claim_portal_push() RETURNS TABLE(notification_id uuid,subscription_id uuid,title text,body text,subscription jsonb)
 LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH candidates AS (
  SELECT d.notification_id,d.subscription_id FROM public.portal_push_deliveries d WHERE d.delivered_at IS NULL AND d.attempts<5
  AND d.next_attempt_at<=now() AND (d.lease_until IS NULL OR d.lease_until<now()) ORDER BY d.next_attempt_at LIMIT 20 FOR UPDATE SKIP LOCKED
 ), claimed AS (
  UPDATE public.portal_push_deliveries d SET lease_until=now()+interval '2 minutes',attempts=d.attempts+1
  FROM candidates c WHERE d.notification_id=c.notification_id AND d.subscription_id=c.subscription_id RETURNING d.notification_id,d.subscription_id
 ) SELECT c.notification_id,c.subscription_id,n.title,n.body,s.subscription FROM claimed c
 JOIN public.portal_notifications n ON n.id=c.notification_id JOIN public.portal_push_subscriptions s ON s.id=c.subscription_id;
$$;
COMMIT;
