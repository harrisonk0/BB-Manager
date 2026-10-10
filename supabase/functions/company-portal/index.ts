import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import webpush from 'npm:web-push@3.6.7';
import {
  buildCalendarFeed,
  generateAccessCode,
  isAllowedPushEndpoint,
} from '../_shared/calendar.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const allowedOrigin = (origin: string) =>
  origin === 'https://bb-manager.vercel.app' ||
  /^https:\/\/bb-manager-[a-z0-9-]+\.vercel\.app$/.test(origin) ||
  /^http:\/\/(localhost|127\.0\.0\.1):(3000|4173|5173)$/.test(origin);
const sha = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
const check = (result: { error: { message: string } | null }) => {
  if (result.error) throw new Error(result.error.message);
};

async function dispatchPush() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey)
    throw new Error('Push delivery is not configured.');
  webpush.setVapidDetails(
    'https://bb-manager.vercel.app',
    publicKey,
    privateKey,
  );
  const claimed = await admin.rpc('claim_portal_push');
  check(claimed);
  let sent = 0;
  const deliver = async (row: {
    subscription: webpush.PushSubscription;
    subscription_id: string;
    notification_id: string;
    title: string;
    body: string;
  }) => {
    let delivered = false;
    try {
      if (!isAllowedPushEndpoint(row.subscription.endpoint))
        throw new Error('Invalid push endpoint');
      await webpush.sendNotification(
        row.subscription,
        JSON.stringify({ title: row.title, body: row.body }),
        { TTL: 86400, timeout: 10000 },
      );
      delivered = true;
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        check(
          await admin
            .from('portal_push_subscriptions')
            .delete()
            .eq('id', row.subscription_id),
        );
        return;
      }
      // No endpoint, account names, keys or payloads are written to logs.
    }
    check(
      await admin
        .from('portal_push_deliveries')
        .update({
          lease_until: null,
          next_attempt_at: new Date(Date.now() + 300000).toISOString(),
          delivered_at: delivered ? new Date().toISOString() : null,
        })
        .eq('notification_id', row.notification_id)
        .eq('subscription_id', row.subscription_id),
    );
  };
  const rows = claimed.data ?? [];
  for (let i = 0; i < rows.length; i += 5) {
    await Promise.all(rows.slice(i, i + 5).map(deliver));
  }
  return sent;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    Vary: 'Origin',
  };
  if (origin && allowedOrigin(origin))
    headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Headers'] =
    'authorization, apikey, content-type, x-client-info';
  headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigin(origin))
    return json({ error: 'Origin not allowed' }, 403);
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  try {
    const feed = new URL(req.url).searchParams.get('feed');
    if (req.method === 'GET' && feed) {
      if (!/^[a-f0-9]{64}$/.test(feed))
        return json({ error: 'Calendar link not found' }, 404);
      const account = await admin
        .from('portal_accounts')
        .select('member_id')
        .eq('feed_hash', await sha(feed))
        .not('activated_at', 'is', null)
        .maybeSingle();
      check(account);
      if (!account.data) return json({ error: 'Calendar link not found' }, 404);
      const events = await admin
        .from('company_events')
        .select('*')
        .order('starts_at');
      check(events);
      return new Response(buildCalendarFeed(events.data ?? []), {
        headers: {
          ...headers,
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'inline; filename="bb-company.ics"',
        },
      });
    }
    if (req.method !== 'POST')
      return json({ error: 'Method not allowed' }, 405);
    if (Number(req.headers.get('content-length') ?? 0) > 16000)
      return json({ error: 'Request too large' }, 413);
    const text = await req.text();
    if (text.length > 16000) return json({ error: 'Request too large' }, 413);
    const body = JSON.parse(text);
    const action = body.action;
    if (action === 'config')
      return json({ publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? null });
    if (
      action === 'dispatch' &&
      Deno.env.get('PORTAL_WORKER_SECRET') &&
      req.headers.get('x-portal-worker') ===
        Deno.env.get('PORTAL_WORKER_SECRET')
    ) {
      return json({ sent: await dispatchPush() });
    }
    if (action === 'exchange') {
      if (
        typeof body.username !== 'string' ||
        !/^[a-z0-9][a-z0-9._-]{2,39}$/i.test(body.username) ||
        typeof body.code !== 'string' ||
        !/^[A-Z0-9]{6}$/i.test(body.code)
      )
        return json(
          {
            error:
              'Invalid or used setup link. Ask a staff member for a new link.',
          },
          400,
        );
      // The gateway appends the connecting peer to X-Forwarded-For.
      const ip = (req.headers.get('x-forwarded-for') ?? 'unknown')
        .split(',')
        .at(-1)!
        .trim();
      const matched = await admin.rpc('portal_check_code', {
        p_username: body.username.toLowerCase(),
        p_code: body.code.toUpperCase(),
        p_ip_key: await sha(ip),
      });
      check(matched);
      if (!matched.data)
        return json(
          {
            error:
              'Invalid or used setup link, or too many attempts. Ask a staff member for help.',
          },
          400,
        );
      const user = await admin.auth.admin.getUserById(matched.data);
      check(user);
      if (!user.data.user?.email) throw new Error('Account unavailable');
      const link = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.data.user.email,
      });
      check(link);
      if (!link.data.properties)
        throw new Error('Could not issue setup session');
      return json({ tokenHash: link.data.properties.hashed_token });
    }
    const bearer = req.headers.get('authorization')?.replace(/^Bearer /i, '');
    if (!bearer) return json({ error: 'Sign in first' }, 401);
    const userResult = await admin.auth.getUser(bearer);
    if (userResult.error || !userResult.data.user)
      return json({ error: 'Sign in again' }, 401);
    const user = userResult.data.user;
    const profile = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    check(profile);
    const staff = ['admin', 'captain', 'officer'].includes(
      profile.data?.role ?? '',
    );
    const account = await admin
      .from('portal_accounts')
      .select('member_id,activated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    check(account);
    if (action === 'provision') {
      if (!staff) return json({ error: 'Staff access required' }, 403);
      if (typeof body.memberId !== 'string')
        return json({ error: 'Select a Company boy' }, 400);
      const member = await admin
        .from('members')
        .select('id,name')
        .eq('id', body.memberId)
        .eq('section', 'company')
        .single();
      check(member);
      const existing = await admin
        .from('portal_accounts')
        .select('username,user_id')
        .eq('member_id', body.memberId)
        .maybeSingle();
      check(existing);
      if (!member.data) throw new Error('Company member not found');
      const base =
        member.data.name
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 25) || 'boy';
      const username =
        existing.data?.username ??
        `${base}.${body.memberId.replace(/-/g, '').slice(0, 8)}`;
      const code = generateAccessCode();
      const created = await admin.auth.admin.createUser({
        email: `${crypto.randomUUID()}@boys.bb-manager.invalid`,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: {
          portal: true,
          username,
          full_name: member.data.name,
          display_name: member.data.name,
        },
      });
      check(created);
      const newId = created.data.user!.id;
      let previousId: string | null;
      try {
        const issued = await admin.rpc('portal_issue_code', {
          p_member_id: body.memberId,
          p_user_id: newId,
          p_username: username,
          p_code: code,
        });
        check(issued);
        previousId = issued.data;
      } catch (error) {
        await admin.auth.admin.deleteUser(newId);
        throw error;
      }
      if (previousId) check(await admin.auth.admin.deleteUser(previousId));
      return json({
        memberId: body.memberId,
        username,
        code,
        link: `https://bb-manager.vercel.app/?username=${encodeURIComponent(username)}&code=${code}`,
      });
    }
    if (!account.data)
      return json({ error: 'Company portal access required' }, 403);
    if (action === 'complete') {
      const done = await admin.rpc('portal_complete_setup', {
        p_user_id: user.id,
      });
      check(done);
      if (!done.data) return json({ error: 'Create a passkey first' }, 400);
      return json({ ok: true });
    }
    if (!account.data.activated_at)
      return json({ error: 'Finish passkey setup first' }, 403);
    if (action === 'subscription-status') {
      const existing = await admin
        .from('portal_push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('endpoint', String(body.endpoint))
        .maybeSingle();
      check(existing);
      return json({ subscribed: !!existing.data });
    }
    if (action === 'feed') {
      const token = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
      check(
        await admin
          .from('portal_accounts')
          .update({ feed_hash: await sha(token) })
          .eq('user_id', user.id),
      );
      return json({ url: `${url}/functions/v1/company-portal?feed=${token}` });
    }
    if (action === 'subscribe') {
      const s = body.subscription;
      if (
        !s ||
        typeof s.endpoint !== 'string' ||
        !isAllowedPushEndpoint(s.endpoint) ||
        !s.keys ||
        !/^[A-Za-z0-9_-]{80,100}$/.test(s.keys.p256dh ?? '') ||
        !/^[A-Za-z0-9_-]{20,30}$/.test(s.keys.auth ?? '')
      )
        return json({ error: 'Invalid browser subscription' }, 400);
      // Never let another account reassign an existing endpoint.
      const old = await admin
        .from('portal_push_subscriptions')
        .select('user_id')
        .eq('endpoint', s.endpoint)
        .maybeSingle();
      check(old);
      if (old.data && old.data.user_id !== user.id)
        return json(
          {
            error:
              'Disable notifications for the previous account on this browser first',
          },
          409,
        );
      const count = await admin
        .from('portal_push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      check(count);
      if (!old.data && (count.count ?? 0) >= 10)
        return json({ error: 'Too many notification devices' }, 400);
      check(
        await admin
          .from('portal_push_subscriptions')
          .upsert(
            { user_id: user.id, endpoint: s.endpoint, subscription: s },
            { onConflict: 'endpoint' },
          ),
      );
      return json({ ok: true });
    }
    if (action === 'unsubscribe') {
      check(
        await admin
          .from('portal_push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', String(body.endpoint)),
      );
      return json({ ok: true });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    // Credential/link errors must not leak usernames, secrets, or internal SQL.
    console.error(
      'Company portal request failed:',
      error instanceof Error ? error.name : 'Error',
    );
    return json(
      { error: 'Could not complete this request. Please try again.' },
      500,
    );
  }
});
