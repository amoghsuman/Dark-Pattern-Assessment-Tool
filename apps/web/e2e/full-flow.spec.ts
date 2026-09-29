import { expect, test } from '@playwright/test';

import { TEST_PASSCODE } from './support/env';

// The walkthrough a reviewer takes: gate → home → wizard → run → overview → matrix → finding →
// review → report → export.
test.use({ storageState: { cookies: [], origins: [] } });

test('complete walkthrough from access gate to report export', async ({ page }) => {
  test.setTimeout(180_000);

  // Access gate
  await page.goto('/');
  await expect(page).toHaveURL('/access');
  await page.getByLabel('Passcode').fill(TEST_PASSCODE);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Assessments' })).toBeVisible();

  // Wizard: a website-only assessment from the template journey
  await page.getByRole('link', { name: 'New assessment' }).click();
  await page.getByLabel('Assessment name').fill('Health renewal walkthrough');
  await page.getByText('Website', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Base URL').fill('https://health.examplelife.example');
  await page.getByRole('button', { name: 'Next' }).click(); // targets
  await page.getByRole('button', { name: 'Website template' }).click();
  await page.getByRole('button', { name: 'Next' }).click(); // journeys
  await page.getByRole('button', { name: 'Next' }).click(); // captures
  await page.getByRole('button', { name: 'Next' }).click(); // patterns
  await page.getByRole('checkbox', { name: 'Launch with outstanding items' }).click();
  await page.getByRole('button', { name: 'Launch assessment' }).click();

  // Run view completes
  await expect(page).toHaveURL(/\/run$/);
  await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible({
    timeout: 45_000,
  });

  // Overview and matrix of the completed sample assessment
  await page.goto('/assessments/asm-digital-h1');
  await expect(page.getByText('Patterns non-compliant')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Assessment sections' })
    .getByRole('link', { name: 'Compliance matrix' })
    .click();
  await page.getByRole('button', { name: /^Trick Question, Consent Withdrawal:/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Trick Question · Consent Withdrawal' });
  await drawer.getByRole('link', { name: 'Open finding' }).first().click();

  // Finding review as a reviewer
  await expect(page.getByTestId('finding-reference')).toHaveText(/ELI-2026-03[45]/);
  await page.getByRole('button', { name: 'Sample data options' }).click();
  await page.getByRole('menuitemradio', { name: /^Reviewer/ }).click();
  const action = page.getByRole('button', { name: /^(Confirm|Start review)$/ }).first();
  await action.click();
  await expect(page.getByText(/is now (Confirmed|Under Review)/)).toBeVisible();

  // Report and export
  await page
    .getByRole('navigation', { name: 'Assessment sections' })
    .getByRole('link', { name: 'Report' })
    .click();
  await expect(page.getByRole('article', { name: 'Assessment report' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel risk register' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
});
