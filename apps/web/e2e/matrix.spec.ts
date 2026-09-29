import { expect, test } from '@playwright/test';

const MATRIX = '/assessments/asm-digital-h1/matrix';

test('shows every state and marker with the approved colour rules', async ({ page }) => {
  await page.goto(MATRIX);
  const grid = page.getByRole('table', { name: 'Compliance matrix' });
  await expect(grid.getByRole('row')).toHaveCount(14); // header + 13 patterns
  await expect(grid.getByRole('columnheader')).toHaveCount(10); // pattern + 9 stages

  const cell = (name: RegExp) => grid.getByRole('button', { name });
  await expect(cell(/^Drip Pricing, Payment: Non-compliant, 2 findings$/)).toHaveAttribute(
    'data-state',
    'non_compliant',
  );
  // All Detected: yellow with "Awaiting review", never red.
  await expect(cell(/^Basket Sneaking, Renewal:/)).toHaveAttribute(
    'data-marker',
    'awaiting_review',
  );
  await expect(cell(/^Basket Sneaking, Renewal:/)).toHaveAttribute('data-state', 'in_progress');
  // All Closed: green with "Remediated".
  await expect(cell(/^False Urgency, Payment:/)).toHaveAttribute('data-marker', 'remediated');
  await expect(cell(/^False Urgency, Payment:/)).toHaveAttribute('data-state', 'compliant');
  // All Dismissed: plain green.
  await expect(cell(/^Confirm Shaming, Payment: Assessed and compliant, 1 finding$/)).toBeVisible();
  // Coverage gap: grey.
  await expect(cell(/^Drip Pricing, Claims: Not yet assessed$/)).toHaveAttribute(
    'data-state',
    'not_assessed',
  );

  const legend = page.getByLabel('Legend');
  await expect(legend).toContainText('Non-compliant (10)');
  await expect(legend).toContainText('Not yet assessed (10)');
});

test('cell drawer shows evidence, rationale, rule reference and remediation', async ({ page }) => {
  await page.goto(MATRIX);
  await page.getByRole('button', { name: /^Drip Pricing, Payment:/ }).click();
  await expect(page).toHaveURL(`${MATRIX}?pattern=drip_pricing&stage=stg-payment`);

  const drawer = page.getByRole('dialog', { name: 'Drip Pricing · Payment' });
  await expect(drawer.getByText('ELI-2026-024')).toBeVisible();
  await expect(drawer.getByText('ELI-2026-025')).toBeVisible();
  await expect(drawer.getByRole('img', { name: 'Payment summary' })).toBeVisible();
  await expect(drawer.getByText('pricing/term/pricing-rules.yaml (lines 27–33)')).toBeVisible();
  await expect(drawer.getByText('Guideline 4 read with Annexure 1, item 8')).toBeVisible();
  await expect(drawer.getByText('dp-08-drip-pricing v0.1.0')).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Open finding' }).first()).toHaveAttribute(
    'href',
    /\/assessments\/asm-digital-h1\/findings\/fnd-h1-02[45]$/,
  );

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(MATRIX);
});

test('not-assessed cells explain why', async ({ page }) => {
  await page.goto(`${MATRIX}?pattern=drip_pricing&stage=stg-claims`);
  const drawer = page.getByRole('dialog', { name: 'Drip Pricing · Claims' });
  await expect(drawer.getByText(/third-party administrator portal/)).toBeVisible();
});

test('cells are keyboard accessible', async ({ page }) => {
  await page.goto(MATRIX);
  await page.getByRole('button', { name: /^Nagging, Renewal:/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Nagging · Renewal' })).toBeVisible();
});

test('columns follow the journey stage order configured in Settings', async ({ page }) => {
  await page.goto('/settings?tab=stages');
  await page.getByRole('button', { name: 'Move Quote and Comparison up' }).click();
  await page.getByLabel('Name of stage 9', { exact: true }).fill('Consent and Mandate Withdrawal');
  await page.getByRole('button', { name: 'Save stages' }).click();
  await expect(page.getByText('Journey stages saved')).toBeVisible();

  await page.goto(MATRIX);
  const headers = page.getByRole('table', { name: 'Compliance matrix' }).getByRole('columnheader');
  await expect(headers.nth(1)).toHaveText('Quote and Comparison');
  await expect(headers.nth(2)).toHaveText('Product Discovery');
  await expect(headers.nth(9)).toHaveText('Consent and Mandate Withdrawal');
});

test('a running assessment leaves unanalysed cells grey', async ({ page }) => {
  await page.goto('/assessments/asm-renewal-prelaunch/matrix?pattern=nagging&stage=stg-renewal');
  const drawer = page.getByRole('dialog', { name: 'Nagging · Renewal' });
  await expect(drawer.getByText('Analysis still running')).toBeVisible();
});
