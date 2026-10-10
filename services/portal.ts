import { supabase } from './supabaseClient';
import type {
  CalendarSettings,
  CompanyEvent,
  PortalAccount,
  PortalSummary,
  SetupLink,
} from '../types/portal';

export const portalRequest = async <T = { ok: boolean }>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('company-portal', {
    body: { action, ...payload },
  });
  if (error) {
    let message = 'Could not complete this request. Please try again.';
    try {
      const body = await error.context.json();
      if (body.error) message = body.error;
    } catch {
      /* Offline or gateway failure. */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
};
export const getPortalAccount = async (): Promise<PortalAccount | null> => {
  const user = await supabase.auth.getUser();
  if (!user.data.user) return null;
  const r = await supabase
    .from('portal_accounts')
    .select('member_id,user_id,username,activated_at,created_at')
    .eq('user_id', user.data.user.id)
    .maybeSingle();
  if (r.error) throw r.error;
  return r.data;
};
export const listPortalAccounts = async (): Promise<PortalAccount[]> => {
  const r = await supabase
    .from('portal_accounts')
    .select('member_id,user_id,username,activated_at,created_at');
  if (r.error) throw r.error;
  return r.data;
};
export const provisionPortalAccount = (memberId: string) =>
  portalRequest<SetupLink>('provision', { memberId });
export const getPortalSummary = async (): Promise<PortalSummary> => {
  const r = await supabase.rpc('company_portal_summary');
  if (r.error) throw r.error;
  return r.data as unknown as PortalSummary;
};
export const listCompanyEvents = async (): Promise<CompanyEvent[]> => {
  const r = await supabase
    .from('company_events')
    .select('*')
    .order('starts_at');
  if (r.error) throw r.error;
  return r.data;
};
export const getCalendarSettings =
  async (): Promise<CalendarSettings | null> => {
    const r = await supabase
      .from('company_calendar_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  };
export const generateCompanyNights = async (settings: CalendarSettings) => {
  const r = await supabase.from('company_calendar_settings').upsert(settings);
  if (r.error) throw r.error;
  const generated = await supabase.rpc('generate_company_nights');
  if (generated.error) throw generated.error;
  return generated.data;
};
export const saveCompanyEvent = async (event: {
  id?: string;
  revision?: number;
  title: string;
  startsLocal: string;
  endsLocal: string;
  location: string;
  details: string;
  cancelled: boolean;
}) => {
  const r = await supabase.rpc('save_company_event', {
    p_id: event.id ?? null,
    p_revision: event.revision ?? 0,
    p_title: event.title,
    p_starts_local: event.startsLocal,
    p_ends_local: event.endsLocal,
    p_location: event.location,
    p_details: event.details,
    p_cancelled: event.cancelled,
  });
  if (r.error) throw r.error;
  return r.data;
};

export const captureSetupLink = () => {
  const u = new URL(window.location.href);
  const username = u.searchParams.get('username');
  const code = u.searchParams.get('code');
  if (!username || !code) return null;
  u.searchParams.delete('username');
  u.searchParams.delete('code');
  window.history.replaceState(null, '', u.pathname + u.search + u.hash);
  return { username, code };
};

export const londonDateTime = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};
export const eventDateLabel = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    year: 'numeric',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const notificationSupport = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;
export const portalNotificationsEnabled = async () => {
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  const status = await portalRequest<{ subscribed: boolean }>(
    'subscription-status',
    { endpoint: subscription.endpoint },
  );
  return status.subscribed;
};
export const enablePortalNotifications = async () => {
  if (!notificationSupport())
    throw new Error(
      'This browser does not support push notifications. On iPhone, add BB Manager to your Home Screen first.',
    );
  const permission = await Notification.requestPermission();
  if (permission !== 'granted')
    throw new Error(
      'Notifications are blocked. You can enable them in your browser settings.',
    );
  const config = await portalRequest<{ publicKey: string | null }>('config');
  if (!config.publicKey)
    throw new Error('Notifications are not available yet.');
  const registration = await navigator.serviceWorker.register('/portal-sw.js');
  await navigator.serviceWorker.ready;
  const raw = atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/'));
  const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const status = await portalRequest<{ subscribed: boolean }>(
      'subscription-status',
      { endpoint: subscription.endpoint },
    );
    if (!status.subscribed) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  await portalRequest('subscribe', { subscription: subscription.toJSON() });
};
export const disablePortalNotifications = async () => {
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await portalRequest('unsubscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
};
