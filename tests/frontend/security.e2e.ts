import { expect, test, type Page, type Route } from '@playwright/test';
import { installSyntheticBackend } from './fixtures/backend';

// These exercise the integrated App and real service/hook code against a denied-external-network
// fixture. They establish client lifecycle safety, not server RLS/Edge authorization.
const json = (route: Route, data: unknown, status = 200) => route.fulfill({status, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body:JSON.stringify(data)});
const signOutThroughRealService = (page: Page) => page.evaluate(async () => {
  const path = '/services/supabaseAuth.ts';
  const auth = await import(path);
  await auth.signOut();
});
const focusRefresh = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('focus')));
const ordinarySummary = {name:'Synthetic Ordinary',squad:1,isSquadLeader:false,memberRank:null,total:0,attended:0,recorded:0,companyRank:1,squadRank:1,marks:[],teammates:[],squadMembers:null,squads:[]};
const oldLeaderSummary = {...ordinarySummary,name:'Obsolete Squad Secret',isSquadLeader:true,squadMembers:[{id:'synthetic-old-squad',name:'Obsolete Teammate Secret',isSquadLeader:false,marks:[{date:'2026-09-18',score:8}]}]};

for (const endpoint of ['profiles','members'] as const) {
  test(`late ${endpoint} response cannot restore staff data after sign-out`, async ({page}) => {
    const fixture = await installSyntheticBackend(page);
    let release!: () => Promise<void>;
    let held = false;
    await page.route(`**/rest/v1/${endpoint}?*`, async route => {
      held = true;
      await new Promise<void>(resolve => {release = async () => {await json(route,endpoint === 'profiles' ? {role:'captain'} : fixture.members); resolve();};});
    });
    await page.goto('/');
    await expect.poll(() => held).toBe(true);
    await signOutThroughRealService(page);
    await expect(page.getByRole('button',{name:/sign in/i}).first()).toBeVisible();
    await release();
    await page.waitForTimeout(200);
    await expect(page.locator('.bb-staff-shell')).toHaveCount(0);
    await expect(page.getByText('Alexander Montgomery-Worthington',{exact:true})).toHaveCount(0);
    expect(fixture.signedOut).toBe(true);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('logout destroys routed staff pages and Back cannot reveal cached member details', async ({page}) => {
  const fixture = await installSyntheticBackend(page);
  await page.goto('/');
  await page.getByRole('button',{name:'View marks for Alexander Montgomery-Worthington',exact:true}).click();
  await expect(page.getByRole('heading',{name:"Alexander Montgomery-Worthington's Marks"})).toBeVisible();
  await signOutThroughRealService(page);
  await expect(page.locator('.bb-staff-shell')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('button',{name:/sign in/i}).first()).toBeVisible();
  await expect(page.getByText('Alexander Montgomery-Worthington',{exact:true})).toHaveCount(0);
  await expect(page.locator('.sheet-modal.modal-in')).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

for (const outcome of ['ordinary','revoked'] as const) {
  test(`overlapping portal refresh rejects obsolete leader response after ${outcome}`, async ({page}) => {
    const fixture = await installSyntheticBackend(page,{role:'boy',leader:true});
    await page.goto('/');
    await expect(page.getByRole('heading',{name:'My stats This BB year',exact:true})).toBeVisible();
    let request = 0;
    let release!: () => Promise<void>;
    await page.route('**/rest/v1/rpc/company_portal_summary', async route => {
      request++;
      if (request === 1) {
        await new Promise<void>(resolve => {release = async () => {await json(route,oldLeaderSummary);resolve();};});
      } else if (outcome === 'ordinary') await json(route,ordinarySummary);
      else await json(route,{message:'Synthetic portal access revoked',code:'P0001'},403);
    });
    await focusRefresh(page);
    await expect.poll(() => request).toBe(1);
    await focusRefresh(page);
    await expect.poll(() => request).toBe(2);
    if (outcome === 'ordinary') await expect(page.getByRole('heading',{name:/Hi, Synthetic/})).toBeVisible();
    else await expect(page.getByText('Could not load your portal.',{exact:true})).toBeVisible();
    await release();
    await page.waitForTimeout(200);
    await expect(page.getByText('Obsolete Squad Secret',{exact:false})).toHaveCount(0);
    await expect(page.getByText('Obsolete Teammate Secret',{exact:false})).toHaveCount(0);
    await expect(page.locator('a[href="/portal/squad/"]')).toHaveCount(0);
    expect(fixture.requests.filter(row => /\/rest\/v1\/(members|marks)$/.test(row.path))).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('revoked portal summary clears private feed from cached pages and retry state', async ({page}) => {
  const fixture = await installSyntheticBackend(page,{role:'boy'});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'My stats This BB year',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'Company portal',exact:true}).getByRole('link',{name:'Calendar',exact:true}).click();
  await page.getByText('Calendar subscription',{exact:true}).click();
  await expect(page.getByLabel('Calendar subscription URL',{exact:true})).toHaveValue('https://example.invalid/synthetic-feed.ics');
  let revoked = true;
  await page.route('**/rest/v1/rpc/company_portal_summary', route => revoked ? json(route,{message:'Synthetic portal access revoked',code:'P0001'},403) : route.fallback());
  await focusRefresh(page);
  await expect(page.getByRole('alert').getByText('Could not load your portal.',{exact:true})).toBeVisible();
  expect(await page.locator('input').evaluateAll(inputs => inputs.some(input => (input as HTMLInputElement).value.includes('synthetic-feed')))).toBe(false);
  revoked = false;
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByText('Calendar subscription',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Calendar subscription URL',{exact:true})).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

test('late previous-principal role response cannot promote a newly signed-in officer', async ({page}) => {
  const fixture = await installSyntheticBackend(page);
  let release!: () => Promise<void>;
  let oldRoleHeld = false;
  await page.route('**/rest/v1/profiles?*', async route => {
    if (new URL(route.request().url()).searchParams.get('id')?.endsWith('000000000001')) {
      oldRoleHeld = true;
      await new Promise<void>(resolve => { release = async () => {await json(route,{role:'captain'});resolve();}; });
    } else await json(route,{role:'officer'});
  });
  await page.goto('/');
  await expect.poll(() => oldRoleHeld).toBe(true);
  const nextUser = {id:'00000000-0000-4000-8000-000000000002',email:'next-officer@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  await page.route('**/auth/v1/user', route => json(route,nextUser));
  await page.evaluate(async user => {
    const path='/services/supabaseClient.ts';
    const {supabase}=await import(path);
    const token=`${btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))}.${btoa(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))}.synthetic-only`;
    await supabase.auth.setSession({access_token:token,refresh_token:'synthetic-only'});
  },nextUser);
  await expect(page.getByRole('heading',{name:'Members',exact:true})).toBeVisible();
  await release();
  await page.getByRole('button',{name:'Workspace and account',exact:true}).click();
  await expect(page.getByText('next-officer@example.invalid',{exact:true})).toBeVisible();
  await expect(page.getByText('officer',{exact:true})).toBeVisible();
  await expect(page.getByText('captain',{exact:true})).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

test('setup-link credentials are scrubbed before protected router initialization', async ({page}) => {
  const fixture = await installSyntheticBackend(page,{signedOut:true});
  await page.goto('/?username=synthetic.setup&code=SYN123#!/home/');
  await expect(page.getByRole('heading',{name:'Welcome, synthetic.setup',exact:true})).toBeVisible();
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);
  expect(new URL(page.url()).searchParams.has('username')).toBe(false);
  await expect(page.locator('.bb-staff-shell,.bb-portal-shell')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(history.state))).not.toContain('SYN123');
  expect(fixture.requests.some(row => /\/(members|marks)$/.test(row.path))).toBe(false);
  expect(fixture.unexpected).toEqual([]);
});

test('same-principal staff role revocation on resume destroys cached protected pages', async ({page}) => {
  const fixture = await installSyntheticBackend(page);
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Members',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View marks for Alexander Montgomery-Worthington',exact:true}).click();
  await expect(page.getByRole('heading',{name:"Alexander Montgomery-Worthington's Marks"})).toBeVisible();
  await page.route('**/rest/v1/profiles?*', route => json(route,null));
  await page.route('**/rest/v1/portal_accounts?*', route => json(route,null));
  await focusRefresh(page);
  await expect(page.locator('.bb-staff-shell')).toHaveCount(0);
  await expect(page.getByText('Your account does not have an assigned role.',{exact:false})).toBeVisible();
  await expect(page.getByText('Alexander Montgomery-Worthington',{exact:true})).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});


test('same-principal portal account revocation on resume destroys cached portal pages', async ({page}) => {
  const fixture = await installSyntheticBackend(page,{role:'boy',leader:true});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'My stats This BB year',exact:true})).toBeVisible();
  await page.route('**/rest/v1/portal_accounts?*', route => json(route,null));
  await focusRefresh(page);
  await expect(page.locator('.bb-portal-shell')).toHaveCount(0);
  await expect(page.getByText('Your account does not have an assigned role.',{exact:false})).toBeVisible();
  await expect(page.getByText('Alexander Montgomery-Worthington',{exact:true})).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

test('officer navigation and deep links retain restricted section settings and available account', async ({page}) => {
  const fixture = await installSyntheticBackend(page,{role:'officer'});
  await page.goto('/#!/settings/');
  await expect(page.getByRole('heading',{name:'Members',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);
  await expect(page.getByText('Start new BB session',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Workspace and account',exact:true}).click();
  await expect(page.getByText('Account and passkeys',{exact:true})).toBeVisible();
  await expect(page.getByText('Archives',{exact:true}).last()).toBeVisible();
  expect(fixture.unexpected).toEqual([]);
});
