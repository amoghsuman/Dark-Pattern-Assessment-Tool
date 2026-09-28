import { expect, test, type Page } from '@playwright/test';

async function actAs(page: Page, role: 'Admin' | 'Assessor' | 'Reviewer' | 'Viewer') {
  await page.getByRole('button', { name: 'Sample data options' }).click();
  await page.getByRole('menuitemradio', { name: new RegExp(`^${role}`) }).click();
  await expect(page.getByText(`Now acting as ${role}`)).toBeVisible();
}

test('role switcher changes the acting user and permissions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'New assessment' })).toBeVisible();

  await actAs(page, 'Viewer');
  await expect(page.getByRole('button', { name: /Account: Rohan Das, Viewer/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New assessment' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: /Account: Rohan Das, Viewer/ })).toBeVisible();
});

test('reset discards changes but keeps the role', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Name', { exact: true }).fill('Example Life Insurance Ltd');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByTestId('organization-name')).toHaveText('Example Life Insurance Ltd');

  await page.getByRole('button', { name: 'Sample data options' }).click();
  await page.getByRole('menuitem', { name: 'Reset sample data…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByTestId('organization-name')).toHaveText('Example Life Insurance');
  await expect(page.getByRole('button', { name: /Account: Priya Raman, Admin/ })).toBeVisible();
});

test('sign out from the account menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Account:/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/access');
});
