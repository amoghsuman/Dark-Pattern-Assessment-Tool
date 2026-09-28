import { expect, test } from '@playwright/test';

test('home page renders the product shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Assessments' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dark Pattern Assessment Tool' })).toBeVisible();
  await expect(page.getByTestId('data-source')).toHaveText('Data source: sample');
});

test('theme toggle cycles to dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: /^System theme/ }).click(); // system → light
  await page.getByRole('button', { name: /^Light theme/ }).click(); // light → dark
  await expect(page.locator('html')).toHaveClass(/dark/);
});
