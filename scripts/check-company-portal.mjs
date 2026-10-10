import { createClient } from '@supabase/supabase-js';
import { fetch, ProxyAgent } from 'undici';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const required = (name) => {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} is required for the opt-in portal contract check.`,
    );
  return value;
};
const url = required('VITE_SUPABASE_URL');
const anonKey = required('VITE_SUPABASE_ANON_KEY');
const serviceKey = required('PORTAL_TEST_SERVICE_ROLE_KEY');
const proxy = process.env.HTTPS_PROXY
  ? new ProxyAgent(process.env.HTTPS_PROXY)
  : undefined;
const fetchWithProxy = (url, options) =>
  fetch(url, { ...options, dispatcher: proxy });
const admin = createClient(url, serviceKey, {
  global: { fetch: fetchWithProxy },
  auth: { persistSession: false, autoRefreshToken: false },
});
const client = () =>
  createClient(url, anonKey, {
    global: { fetch: fetchWithProxy },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      experimental: { passkey: true },
    },
  });
const check = (r) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
const invoke = async (c, action, payload = {}) => {
  const r = await c.functions.invoke('company-portal', {
    body: { action, ...payload },
  });
  if (r.error) {
    let message;
    try {
      message = await r.error.context.json();
    } catch {}
    throw new Error(JSON.stringify(message) || r.error.message);
  }
  return r.data;
};
(async () => {
  let staffId,
    memberIds = [],
    eventId;
  try {
    const email = randomUUID() + '@tests.bb-manager.invalid',
      password = randomUUID() + 'Aa1!';
    staffId = check(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    ).user.id;
    check(
      await admin
        .from('profiles')
        .update({ role: 'officer' })
        .eq('id', staffId),
    );
    const staff = client();
    check(await staff.auth.signInWithPassword({ email, password }));
    const boys = check(
      await admin
        .from('members')
        .insert([
          {
            name: 'PORTAL E2E Alex',
            section: 'company',
            squad: 1,
            school_year: '10',
          },
          {
            name: 'PORTAL E2E Ben',
            section: 'company',
            squad: 2,
            school_year: '11',
          },
        ])
        .select('id'),
    );
    memberIds = boys.map((b) => b.id);
    const link = await invoke(staff, 'provision', { memberId: memberIds[0] });
    assert.match(link.code, /^[A-Z0-9]{6}$/);
    assert.ok(link.link.includes('&code='));
    const boy = client();
    const exchanged = await invoke(boy, 'exchange', {
      username: link.username,
      code: link.code,
    });
    check(
      await boy.auth.verifyOtp({
        token_hash: exchanged.tokenHash,
        type: 'magiclink',
      }),
    );
    const own = check(
      await boy.from('portal_accounts').select('username,activated_at'),
    );
    assert.equal(own.length, 1);
    assert.equal(own[0].activated_at, null);
    assert.ok(
      (await boy.rpc('company_portal_summary')).error,
      'Unactivated account must not get stats',
    );
    assert.equal(check(await boy.from('members').select('id')).length, 0);
    assert.equal(check(await boy.from('marks').select('id')).length, 0);
    assert.ok(
      (await boy.from('portal_accounts').select('code_hash')).error,
      'Secret hashes must not be selectable',
    );
    let rejected = false;
    try {
      await invoke(boy, 'complete');
    } catch {
      rejected = true;
    }
    assert.ok(rejected, 'Completion without passkey must fail');
    const year = 2029;
    eventId = check(
      await staff.rpc('save_company_event', {
        p_id: null,
        p_revision: 0,
        p_title: 'PORTAL E2E Event',
        p_starts_local: year + '-10-09T19:00',
        p_ends_local: year + '-10-09T21:00',
        p_location: 'Test Hall',
        p_details: 'Test details',
        p_cancelled: false,
      }),
    );
    assert.equal(
      check(await boy.from('company_events').select('id')).length,
      0,
      'Unactivated account must not read calendar',
    );
    const saved = check(
      await staff.from('company_events').select('*').eq('id', eventId).single(),
    );
    assert.equal(saved.starts_at, '2029-10-09T18:00:00+00:00');
    check(
      await staff.rpc('save_company_event', {
        p_id: eventId,
        p_revision: saved.revision,
        p_title: saved.title,
        p_starts_local: '2029-10-09T19:00',
        p_ends_local: '2029-10-09T21:00',
        p_location: 'Test Hall',
        p_details: 'Changed details only',
        p_cancelled: false,
      }),
    );
    const notices = check(
      await admin
        .from('portal_notifications')
        .select('id')
        .eq('event_id', eventId),
    );
    assert.equal(notices.length, 1, 'Details-only edits must not notify');
    assert.ok(
      (
        await staff.rpc('save_company_event', {
          p_id: eventId,
          p_revision: saved.revision,
          p_title: saved.title,
          p_starts_local: '2029-10-09T19:00',
          p_ends_local: '2029-10-09T21:00',
          p_location: 'Test Hall',
          p_details: 'Stale edit',
          p_cancelled: false,
        })
      ).error,
      'Stale edit must fail',
    );
    const reset = await invoke(staff, 'provision', { memberId: memberIds[0] });
    assert.equal(reset.username, link.username);
    assert.ok(
      (await boy.auth.getUser()).error,
      'Reset must revoke old identity',
    );
    const account = check(
      await admin
        .from('portal_accounts')
        .select('user_id')
        .eq('member_id', memberIds[0])
        .single(),
    );
    check(await admin.from('members').delete().eq('id', memberIds[0]));
    assert.ok(
      (await admin.auth.admin.getUserById(account.user_id)).error,
      'Removing roster entry must delete auth identity',
    );
    assert.equal(
      check(
        await admin
          .from('portal_accounts')
          .select('member_id')
          .eq('member_id', memberIds[0]),
      ).length,
      0,
    );
    console.log(
      'Live contract checks passed: provision, exchange, inactive-access isolation, passkey requirement, calendar editing, notification filtering, optimistic concurrency, reset and roster deletion.',
    );
  } finally {
    if (eventId)
      check(await admin.from('company_events').delete().eq('id', eventId));
    if (memberIds.length)
      check(await admin.from('members').delete().in('id', memberIds));
    if (staffId) check(await admin.auth.admin.deleteUser(staffId));
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
