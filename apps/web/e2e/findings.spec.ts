import { expect, test, type Page } from '@playwright/test';

const LIST = '/assessments/asm-digital-h1/findings';

async function actAs(page: Page, role: 'Admin' | 'Assessor' | 'Reviewer' | 'Viewer') {
  await page.getByRole('button', { name: 'Sample data options' }).click();
  await page.getByRole('menuitemradio', { name: new RegExp(`^${role}`) }).click();
  await expect(page.getByText(`Now acting as ${role}`)).toBeVisible();
}

test('lists findings and applies URL filters', async ({ page }) => {
  await page.goto(LIST);
  await expect(page.getByTestId('result-count')).toHaveText('41 of 41 findings');

  await page.goto(`${LIST}?severity=critical`);
  await expect(page.getByTestId('result-count')).toHaveText('6 of 41 findings');
  await expect(page.getByRole('button', { name: 'Filter by severity' })).toContainText('1');
});

test('facet filters, search and confidence narrow the list', async ({ page }) => {
  await page.goto(LIST);
  await page.getByRole('button', { name: 'Filter by pattern' }).click();
  await page.getByRole('option', { name: /Nagging/ }).click();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(`${LIST}?pattern=nagging`);
  await expect(page.getByTestId('result-count')).toHaveText('4 of 41 findings');

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Search findings').fill('PremiumCalculator');
  await expect(page.getByTestId('result-count')).toHaveText('1 of 41 findings');
  await expect(
    page.getByRole('link', { name: 'Pricing rule adds a fee only at the payment step' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('combobox', { name: 'Filter by confidence' }).click();
  await page.getByRole('option', { name: '90% or higher' }).click();
  await expect(page).toHaveURL(`${LIST}?confidence=0.9`);
  const rows = page.getByRole('table').getByRole('row');
  await expect(rows).toHaveCount(1 + 16);
});

test('sorts by column headers', async ({ page }) => {
  await page.goto(LIST);
  await page.getByRole('button', { name: 'Confidence' }).click();
  await expect(page).toHaveURL(`${LIST}?sort=confidence&dir=asc`);
  await expect(page.getByRole('table').getByRole('row').nth(1)).toContainText('ELI-2026-038');
});

test('bulk status update applies valid changes and reports skipped ones', async ({ page }) => {
  await page.goto(LIST);
  await actAs(page, 'Reviewer');
  await page.getByLabel('Select ELI-2026-003').check();
  await page.getByLabel('Select ELI-2026-008').check();
  const bulk = page.getByRole('region', { name: 'Bulk actions' });
  await expect(bulk).toContainText('2 selected');
  await bulk.getByRole('combobox', { name: 'New status' }).click();
  await page.getByRole('option', { name: 'Confirmed' }).click();
  await bulk.getByLabel('Note for the audit trail').fill('Bulk confirmation after workshop');
  await bulk.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByText('Updated 1 finding to Confirmed')).toBeVisible();
  await expect(page.getByText('Skipped 1')).toBeVisible();
  await expect(
    page.getByText(/ELI-2026-008: Cannot move from detected to confirmed/),
  ).toBeVisible();
  await expect(
    page.getByRole('row', { name: /ELI-2026-003/ }).getByText('Confirmed'),
  ).toBeVisible();
});

test('viewers cannot select findings', async ({ page }) => {
  await page.goto(LIST);
  await actAs(page, 'Viewer');
  await expect(page.getByLabel('Select ELI-2026-003')).toHaveCount(0);
});
