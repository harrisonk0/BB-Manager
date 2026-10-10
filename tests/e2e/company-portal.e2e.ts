import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { fetch, ProxyAgent } from 'undici';

// Opt-in: service-role access is used only by the Node test process for fixtures.
test.describe('Company portal', () => {
  test.skip(
    !process.env.PORTAL_TEST_SERVICE_ROLE_KEY,
    'Requires the server-only portal fixture credential.',
  );
  test('setup, passkey sign-in, private feed, personal data and roster deletion', async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const proxy = process.env.HTTPS_PROXY
      ? new ProxyAgent(process.env.HTTPS_PROXY)
      : undefined;
    const request = (url: string | URL | Request, options?: RequestInit) =>
      fetch(String(url), {
        ...(options as unknown as import('undici').RequestInit),
        dispatcher: proxy,
      }) as unknown as Promise<Response>;
    const admin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.PORTAL_TEST_SERVICE_ROLE_KEY!,
      {
        global: { fetch: request },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const staff = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      {
        global: { fetch: request },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const check = <T>(result: {
      data: T;
      error: { message: string } | null;
    }): T => {
      if (result.error) throw new Error(result.error.message);
      return result.data;
    };
    let staffId: string | undefined;
    let memberId: string | undefined;
    let eventId: string | undefined;
    const name = `PORTAL-E2E-${randomUUID().slice(0, 8)} Alex`;
    try {
      const email = `${randomUUID()}@tests.bb-manager.invalid`;
      const password = randomUUID() + 'Aa1!';
      staffId = check(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      ).user!.id;
      check(
        await admin
          .from('profiles')
          .update({ role: 'officer' })
          .eq('id', staffId),
      );
      check(await staff.auth.signInWithPassword({ email, password }));
      memberId = check(
        await admin
          .from('members')
          .insert({ name, section: 'company', squad: 1, school_year: '10' })
          .select('id')
          .single(),
      ).id;
      check(
        await admin.from('marks').insert({
          member_id: memberId,
          section: 'company',
          date: '2026-10-09',
          present: true,
          score: 0,
          created_by: staffId,
        }),
      );
      eventId = check(
        await staff.rpc('save_company_event', {
          p_id: null,
          p_revision: 0,
          p_title: name + ' Night',
          p_starts_local: '2029-10-09T19:00',
          p_ends_local: '2029-10-09T21:00',
          p_location: 'Test Hall',
          p_details: 'Bring trainers.',
          p_cancelled: false,
        }),
      );
      const link = check(
        await staff.functions.invoke('company-portal', {
          body: { action: 'provision', memberId },
        }),
      );
      await context.route('https://bb-manager.vercel.app/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await fetch(`${baseURL}${url.pathname}${url.search}`);
        await route.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: Buffer.from(await response.arrayBuffer()),
        });
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('WebAuthn.enable');
      await cdp.send('WebAuthn.addVirtualAuthenticator', {
        options: {
          protocol: 'ctap2',
          transport: 'internal',
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(link.link);
      await page
        .getByRole('button', { name: 'Create my passkey', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: `Hi, ${name.split(' ')[0]}` }),
      ).toBeVisible({ timeout: 45_000 });
      expect(page.url()).not.toContain('code=');
      await expect(page.getByText('100%', { exact: true })).toBeVisible();
      expect(
        await page
          .locator('body')
          .evaluate((el) => el.scrollWidth > innerWidth),
      ).toBe(false);
      await page.getByRole('button', { name: 'Calendar', exact: true }).click();
      await page
        .getByRole('button', { name: 'Create calendar subscription link' })
        .click();
      const feedInput = page.getByLabel('Calendar subscription URL');
      await expect(feedInput).toBeVisible();
      const feed = await feedInput.inputValue();
      const response = await request(feed);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(name + ' Night');
      await page.getByRole('button', { name: 'Account', exact: true }).click();
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Sign in with passkey', exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Email address')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Sign in with passkey', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: `Hi, ${name.split(' ')[0]}` }),
      ).toBeVisible({ timeout: 30_000 });
      const anonymous = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        {
          global: { fetch: request },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const reused = await anonymous.functions.invoke('company-portal', {
        body: { action: 'exchange', username: link.username, code: link.code },
      });
      expect(reused.error).not.toBeNull();
      check(await admin.from('members').delete().eq('id', memberId));
      memberId = undefined;
      expect((await request(feed)).status).toBe(404);
    } finally {
      if (eventId)
        check(await admin.from('company_events').delete().eq('id', eventId));
      if (memberId)
        check(await admin.from('members').delete().eq('id', memberId));
      if (staffId) check(await admin.auth.admin.deleteUser(staffId));
    }
  });
});
