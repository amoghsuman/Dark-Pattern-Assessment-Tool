import { expect, test } from '@playwright/test';

const REPORT = '/assessments/asm-digital-h1/report';

test('report preview contains every section in order', async ({ page }) => {
  await page.goto(REPORT);
  const report = page.getByRole('article', { name: 'Assessment report' });
  await expect(
    report.getByRole('heading', { level: 1, name: 'Digital Journeys Review, H1 FY2026-27' }),
  ).toBeVisible();
  const sections = report.locator('[data-section]');
  await expect(sections).toHaveCount(7);
  const ids = await sections.evaluateAll((els) => els.map((e) => e.getAttribute('data-section')));
  expect(ids).toEqual([
    'cover',
    'executive-summary',
    'scope',
    'heatmap',
    'findings',
    'remediation',
    'annexures',
  ]);

  await expect(report.getByRole('heading', { name: /Executive summary/ })).toBeVisible();
  await expect(report.getByRole('table', { name: 'Compliance heatmap' })).toBeVisible();
  await expect(report.getByRole('heading', { name: '4.8 Drip Pricing' })).toBeVisible();
  await expect(report.getByText('dp-08-drip-pricing', { exact: true }).first()).toBeVisible();
  await expect(report.getByRole('heading', { name: 'A. Rule pack versions' })).toBeVisible();
});

test('exports the Excel risk register', async ({ page }) => {
  await page.goto(REPORT);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel risk register' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(
    /^risk-register-digital-journeys-review-h1-fy2026-27-\d{4}-\d{2}-\d{2}\.xlsx$/,
  );
  await expect(page.getByText('Risk register exported')).toBeVisible();
});

test('Download PDF opens the print dialog with app chrome hidden', async ({ page }) => {
  await page.goto(REPORT);
  await page.evaluate(() => {
    (window as unknown as { printed: boolean }).printed = false;
    window.print = () => {
      (window as unknown as { printed: boolean }).printed = true;
    };
  });
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: boolean }).printed)).toBe(true);

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeHidden();
  await expect(page.getByRole('article', { name: 'Assessment report' })).toBeVisible();
});
