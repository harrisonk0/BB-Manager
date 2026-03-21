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

    await scoreInput.fill(nextValue);
    await page.getByRole('button', { name: 'Save Marks' }).click();
    await expect(page.getByText('Marks saved successfully!')).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'Weekly Marks' }).click();
    await page.getByLabel('Select weekly marks date').fill(marksDate);

    const reloadedScoreInput = page.locator('input[aria-label^="Score for "]:not([disabled])').first();
    await expect(reloadedScoreInput).toHaveValue(nextValue);
  });
});
