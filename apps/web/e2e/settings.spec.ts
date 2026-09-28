import { expect, test } from '@playwright/test';

test('organisation changes persist across reloads', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Name', { exact: true }).fill('Example Life Insurance Company');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Organisation updated')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(
    'Example Life Insurance Company',
  );
  await expect(page.getByTestId('organization-name')).toHaveText('Example Life Insurance Company');
});

test('tabs are addressable by URL', async ({ page }) => {
  await page.goto('/settings?tab=users');
  await expect(page.getByRole('tab', { name: 'Users and roles' })).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(page.getByRole('cell', { name: /Kavya Iyer/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Journey stages' }).click();
  await expect(page).toHaveURL('/settings?tab=stages');
});

test('invite a user and change a role', async ({ page }) => {
  await page.goto('/settings?tab=users');
  await page.getByRole('button', { name: 'Invite user' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Anita Joshi');
  await dialog.getByLabel('Email').fill('anita.joshi@examplelife.example');
  await dialog.getByRole('button', { name: 'Send invite' }).click();
  await expect(page.getByRole('cell', { name: 'Anita Joshi' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Role for Anita Joshi' }).click();
  await page.getByRole('option', { name: 'Reviewer' }).click();
  await expect(page.getByText('Anita Joshi is now reviewer')).toBeVisible();
});

test('journey stages can be renamed, reordered and added', async ({ page }) => {
  await page.goto('/settings?tab=stages');
  const stages = page.getByRole('list', { name: 'Journey stages' });
  await page.getByRole('button', { name: 'Move Quote and Comparison up' }).click();
  await page.getByLabel('Name of stage 9', { exact: true }).fill('Consent and Mandate Withdrawal');
  await page.getByLabel('New stage name').fill('Nominee Update');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Save stages' }).click();
  await expect(page.getByText('Journey stages saved')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Name of stage 1', { exact: true })).toHaveValue(
    'Quote and Comparison',
  );
  await expect(page.getByLabel('Name of stage 9', { exact: true })).toHaveValue(
    'Consent and Mandate Withdrawal',
  );
  await expect(page.getByLabel('Name of stage 10', { exact: true })).toHaveValue('Nominee Update');
  await expect(stages.getByRole('listitem')).toHaveCount(10);
});

test('stages with findings cannot be removed', async ({ page }) => {
  await page.goto('/settings?tab=stages');
  await page.getByRole('button', { name: 'Remove Payment' }).click();
  await page.getByRole('button', { name: 'Save stages' }).click();
  await expect(page.getByText('Could not save journey stages')).toBeVisible();
  await expect(page.getByText(/Cannot remove stages that have findings: Payment/)).toBeVisible();
});

test('non-admins see settings read-only', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sample data options' }).click();
  await page.getByRole('menuitemradio', { name: /^Reviewer/ }).click();
  await expect(page.getByText(/Only admins can change settings/)).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
});
