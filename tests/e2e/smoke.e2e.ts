import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Playwright smoke tests.`);
  }

  return value;
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getFutureMarksDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return formatDate(date);
};

const signIn = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByText('Sign in to your account')).toBeVisible();

  await page.getByLabel('Email address').fill(getRequiredEnv('E2E_TEST_EMAIL'));
  await page.getByLabel('Password').fill(getRequiredEnv('E2E_TEST_PASSWORD'));
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('heading', { name: 'Select a Section' })).toBeVisible();
};

const selectCompanySection = async (page: Page) => {
  await page.getByRole('button', { name: 'Manage Company Section' }).click();
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
};

const openSectionSettings = async (page: Page) => {
  await page.getByRole('button', { name: 'Section Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Section Settings' })).toBeVisible();
};

test.describe('E2E smoke tests', () => {
  test('auth session persists across reload and can sign out', async ({ page }) => {
    await signIn(page);
    await selectCompanySection(page);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Log Out' }).click();

    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('company weekly marks can be saved and reloaded', async ({ page }) => {
    const marksDate = getFutureMarksDate();

    await signIn(page);
    await selectCompanySection(page);
    await page.getByRole('button', { name: 'Weekly Marks' }).click();
    await expect(page.getByRole('heading', { name: 'Weekly Marks' })).toBeVisible();
    await expect(page.getByText('No Members to Mark')).toHaveCount(0);

    await page.getByLabel('Select weekly marks date').fill(marksDate);

    const scoreInput = page.locator('input[aria-label^="Score for "]:not([disabled])').first();
    await expect(scoreInput).toBeVisible();

    const currentValue = await scoreInput.inputValue();
    const nextValue = currentValue === '8' ? '9' : '8';

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/rest/v1/rpc/save_weekly_marks_snapshot'),
    );

    await scoreInput.fill(nextValue);
    await page.getByRole('button', { name: 'Save Marks' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok()).toBeTruthy();

    await page.reload();
    await page.getByRole('button', { name: 'Weekly Marks' }).click();
    await page.getByLabel('Select weekly marks date').fill(marksDate);

    const reloadedScoreInput = page.locator('input[aria-label^="Score for "]:not([disabled])').first();
    await expect(reloadedScoreInput).toHaveValue(nextValue);
  });

  test('company section settings can be saved and restored', async ({ page }) => {
    await signIn(page);
    await selectCompanySection(page);
    await openSectionSettings(page);

    const meetingDaySelect = page.getByLabel('Weekly Meeting Day');
    const originalValue = Number(await meetingDaySelect.inputValue());
    const nextValue = (originalValue + 1) % 7;

    try {
      await meetingDaySelect.selectOption(String(nextValue));
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Settings saved successfully!')).toBeVisible();
      await expect(meetingDaySelect).toHaveValue(String(nextValue));

      await page.reload();
      await openSectionSettings(page);
      await expect(page.getByLabel('Weekly Meeting Day')).toHaveValue(String(nextValue));
    } finally {
      try {
        await openSectionSettings(page);
        const restoreSelect = page.getByLabel('Weekly Meeting Day');
        if ((await restoreSelect.inputValue()) !== String(originalValue)) {
          await restoreSelect.selectOption(String(originalValue));
          await page.getByRole('button', { name: 'Save' }).click();
        }
      } catch (restoreError) {
        console.error('Failed to restore the company meeting day after smoke test:', restoreError);
      }
    }
  });
});
