import { expect, test } from '@playwright/test';

test('home page renders the product shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Assessments' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dark Pattern Assessment Tool' })).toBeVisible();
  await expect(page.getByTestId('data-source')).toHaveText('Data source: sample');
});

test('lists the sample assessments from the data layer', async ({ page }) => {
  await page.goto('/');
  const list = page.getByRole('list', { name: 'Assessments' });
  await expect(list.getByText('Digital Journeys Review, H1 FY2026-27')).toBeVisible();
  await expect(list.getByText('Renewal and Servicing Revamp: Pre-launch')).toBeVisible();
});

test('serves evidence illustrations to signed-in users', async ({ request }) => {
  const response = await request.get('/evidence/web-quote-countdown.svg');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
});

test('theme toggle cycles to dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: /^System theme/ }).click(); // system → light
  await page.getByRole('button', { name: /^Light theme/ }).click(); // light → dark
  await expect(page.locator('html')).toHaveClass(/dark/);
});
