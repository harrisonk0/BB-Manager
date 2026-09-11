import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for isolated Playwright flows.`);
  }
  return value;
};

const MEMBER_PREFIX = process.env.E2E_MEMBER_PREFIX || `ZZZ-E2E-${Date.now()}`;
const MEMBER_NAME = `${MEMBER_PREFIX} Alpha`;
const MEMBER_RENAMED = `${MEMBER_PREFIX} Beta`;

const getRequiredEmail = () => requireEnv('E2E_TEST_EMAIL');
const getRequiredPassword = () => requireEnv('E2E_TEST_PASSWORD');

const formatLocalYmd = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFutureMeetingDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  return formatLocalYmd(date);
};

const confirmDateChangeIfNeeded = async (page: Page) => {
  const confirmButton = page.getByRole('button', { name: 'Change Date' });
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }
};

const signIn = async (page: Page, email = getRequiredEmail(), password = getRequiredPassword()) => {
  await page.goto('/');
  await expect(page.getByText('Sign in to your account')).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
};

const selectCompanySection = async (page: Page) => {
  await expect(page.getByRole('heading', { name: 'Select a Section' })).toBeVisible();
  await page.getByRole('button', { name: 'Manage Company Section' }).click();
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
};

const openUserMenu = async (page: Page) => {
  await page.getByRole('button', { name: 'User menu' }).click();
};

const deleteMembersByPrefix = async () => {
  const supabase = createClient(requireEnv('VITE_SUPABASE_URL'), requireEnv('VITE_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: getRequiredEmail(),
    password: getRequiredPassword(),
  });
  if (signInError) {
    throw new Error(`Cleanup sign-in failed: ${signInError.message}`);
  }

  const { data: rows, error: selectError } = await supabase
    .from('members')
    .select('id,name,section')
    .like('name', `${MEMBER_PREFIX}%`);

  if (selectError) {
    throw new Error(`Cleanup select failed: ${selectError.message}`);
  }

  for (const row of rows ?? []) {
    const { error: deleteError } = await supabase.from('members').delete().eq('id', row.id).eq('section', row.section);
    if (deleteError) {
      throw new Error(`Cleanup delete failed for ${row.id}: ${deleteError.message}`);
    }
  }

  await supabase.auth.signOut();
};

test.describe.configure({ mode: 'serial' });

test.describe('Isolated app flows', () => {
  test.afterAll(async () => {
    await deleteMembersByPrefix();
  });

  test('invalid credentials stay on login with a failure message', async ({ page }) => {
    await signIn(page, 'nobody@example.com', 'wrong-password');
    await expect(page.getByText('Login Failed')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('valid user reaches company roster and session survives reload', async ({ page }) => {
    await signIn(page);
    await selectCompanySection(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  });

  test('officer can create, search, edit, and open a sentinel member', async ({ page }) => {
    await signIn(page);
    await selectCompanySection(page);

    await page.getByRole('button', { name: 'Add Boy' }).click();
    const addDialog = page.getByRole('dialog');
    await expect(addDialog.getByRole('heading', { name: 'Add New Boy' })).toBeVisible();
    await addDialog.getByLabel('Name').fill(MEMBER_NAME);
    await addDialog.getByLabel('School Year').selectOption('8');
    await addDialog.getByLabel('Squad 2').check();
    await addDialog.getByRole('button', { name: 'Add Boy' }).click();
    await expect(page.getByText(`Added '${MEMBER_NAME}' successfully.`)).toBeVisible();

    await page.getByRole('button', { name: 'Toggle search bar' }).click();
    await page.getByLabel('Search members').fill(MEMBER_PREFIX);
    await expect(page.getByText(MEMBER_NAME, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: `Edit ${MEMBER_NAME}` }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: 'Edit Boy' })).toBeVisible();
    await editDialog.getByLabel('Name').fill(MEMBER_RENAMED);
    await editDialog.getByRole('button', { name: 'Update Boy' }).click();
    await expect(page.getByText(`Updated '${MEMBER_RENAMED}' successfully.`)).toBeVisible();
    await expect(page.getByText(MEMBER_RENAMED, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: `View marks for ${MEMBER_RENAMED}` }).click();
    await expect(page.getByRole('heading', { name: `${MEMBER_RENAMED}'s Marks` })).toBeVisible();
    await page.getByRole('button', { name: 'Back to members' }).click();
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByText(MEMBER_RENAMED, { exact: true })).toBeVisible();
  });

  test('weekly marks save and reload for the sentinel member only', async ({ page }) => {
    const marksDate = getFutureMeetingDate();
    await signIn(page);
    await selectCompanySection(page);

    await page.getByRole('button', { name: 'Weekly Marks' }).click();
    await expect(page.getByRole('heading', { name: 'Weekly Marks' })).toBeVisible();

    const dateInput = page.getByLabel('Select weekly marks date');
    await expect(dateInput).not.toHaveValue('');
    await dateInput.fill(marksDate);
    await confirmDateChangeIfNeeded(page);

    const presentToggle = page.getByRole('button', { name: `Mark ${MEMBER_RENAMED} as present` });
    await expect(presentToggle).toBeVisible();
    await presentToggle.click();

    const scoreInput = page.getByLabel(`Score for ${MEMBER_RENAMED}`);
    await expect(scoreInput).toBeEnabled();
    await scoreInput.fill('7');
    await page.getByRole('button', { name: 'Save Marks' }).click();
    await expect(page.getByText('Marks saved successfully!')).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await page.getByRole('button', { name: 'Weekly Marks' }).click();
    await dateInput.fill(marksDate);
    await confirmDateChangeIfNeeded(page);
    await expect(page.getByLabel(`Score for ${MEMBER_RENAMED}`)).toHaveValue('7');
  });

  test('dashboard, PDF modal, account settings, junior switch, then logout', async ({ page }) => {
    await signIn(page);
    await selectCompanySection(page);

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: 'Generate Master PDF' }).click();
    await expect(page.getByRole('heading', { name: 'Master Session PDF' })).toBeVisible();
    await page.getByRole('button', { name: 'Close modal' }).click();

    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Account Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
    await expect(page.getByLabel('Current Password')).toBeVisible();
    await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm New Password')).toBeVisible();

    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Switch Section' }).click();
    await page.getByRole('button', { name: 'Manage Junior Section' }).click();
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByText(MEMBER_RENAMED)).toHaveCount(0);

    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Log Out' }).click();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('sentinel member can be deleted from the roster', async ({ page }) => {
    await signIn(page);
    await selectCompanySection(page);
    await page.getByRole('button', { name: 'Toggle search bar' }).click();
    await page.getByLabel('Search members').fill(MEMBER_PREFIX);
    await expect(page.getByText(MEMBER_RENAMED, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Delete ${MEMBER_RENAMED}` }).click();
    await expect(page.getByRole('heading', { name: 'Confirm Deletion' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(`'${MEMBER_RENAMED}' was deleted.`)).toBeVisible();
    await expect(page.getByText(MEMBER_RENAMED, { exact: true })).toHaveCount(0);
  });
});
