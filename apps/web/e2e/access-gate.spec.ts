import { expect, test } from '@playwright/test';

import { TEST_PASSCODE } from './support/env';

// These specs start signed out.
test.use({ storageState: { cookies: [], origins: [] } });

test('redirects to the access page and keeps the requested path', async ({ page }) => {
  await page.goto('/rules?view=grid');
  await expect(page).toHaveURL('/access?next=%2Frules%3Fview%3Dgrid');
  await expect(page.getByRole('heading', { name: 'Dark Pattern Assessment Tool' })).toBeVisible();
});

test('shows an error for a wrong passcode', async ({ page }) => {
  await page.goto('/access');
  await page.getByLabel('Passcode').fill('not-the-passcode');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'That passcode is not correct.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Passcode')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL('/access');
});

test('correct passcode unlocks the app and returns to the requested path', async ({ page }) => {
  await page.goto('/?tab=all');
  await expect(page).toHaveURL(/\/access\?next=/);
  await page.getByLabel('Passcode').fill(TEST_PASSCODE);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL('/?tab=all');
  await expect(page.getByRole('heading', { level: 1, name: 'Assessments' })).toBeVisible();
});

test('rejects an external next parameter', async ({ page }) => {
  await page.goto('/access?next=//attacker.example');
  await page.getByLabel('Passcode').fill(TEST_PASSCODE);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL('/');
});

test('a forged cookie does not grant access', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'dpat_access', value: 'v1.4102444800.forged', url: baseURL ?? '' },
  ]);
  await page.goto('/');
  await expect(page).toHaveURL('/access');
});

test('sign out returns to the access page', async ({ page }) => {
  await page.goto('/access');
  await page.getByLabel('Passcode').fill(TEST_PASSCODE);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL('/');
  await page.getByRole('button', { name: /Account:/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/access');
  await page.goto('/');
  await expect(page).toHaveURL('/access');
});

test('brand assets load without a session', async ({ request }) => {
  const response = await request.get('/brand/logo.svg', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});
