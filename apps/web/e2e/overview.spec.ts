import { expect, test } from '@playwright/test';

test('overview shows KPIs, distributions and scope', async ({ page }) => {
  await page.goto('/assessments/asm-digital-h1');
  const tabs = page.getByRole('navigation', { name: 'Assessment sections' });
  await expect(tabs.getByRole('link', { name: 'Overview' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await expect(page.getByText('Total findings').locator('..')).toContainText('41');
  await expect(page.getByText('34 open')).toBeVisible();
  await expect(page.getByText('Confirmed non-compliance').locator('..')).toContainText('20');
  await expect(page.getByText('Awaiting review', { exact: true }).locator('..')).toContainText(
    '14',
  );
  await expect(page.getByText('Patterns non-compliant').locator('..')).toContainText('10 of 13');

  const severity = page.getByRole('list', { name: 'Findings by severity' });
  await expect(severity.getByRole('link', { name: /Critical\s*6/ })).toHaveAttribute(
    'href',
    '/assessments/asm-digital-h1/findings?severity=critical',
  );
  const engines = page.getByRole('list', { name: 'Findings by engine' });
  await expect(engines).toContainText('Screen capture');
  await expect(engines).toContainText('22');

  const patterns = page.getByRole('list', { name: 'Findings by pattern' });
  await expect(patterns.getByRole('listitem')).toHaveCount(13);
  await expect(patterns.getByRole('link', { name: /Nagging/ })).toHaveAttribute(
    'href',
    '/assessments/asm-digital-h1/findings?pattern=nagging',
  );

  await expect(
    page.getByText(/Claims settlement is run on a third-party administrator portal/),
  ).toBeVisible();
});

test('the compact matrix opens the full matrix at the chosen cell', async ({ page }) => {
  await page.goto('/assessments/asm-digital-h1');
  await page
    .getByRole('table', { name: 'Compliance matrix summary' })
    .getByRole('link', { name: /^Drip Pricing, Payment:/ })
    .click();
  await expect(page).toHaveURL(
    '/assessments/asm-digital-h1/matrix?pattern=drip_pricing&stage=stg-payment',
  );
  await expect(page.getByRole('dialog', { name: 'Drip Pricing · Payment' })).toBeVisible();
});

test('a running assessment is flagged as partial', async ({ page }) => {
  await page.goto('/assessments/asm-renewal-prelaunch');
  await expect(
    page.getByText('Analysis is still running, so these results are partial.'),
  ).toBeVisible();
  await expect(page.getByText('Total findings').locator('..')).toContainText('6');
});
