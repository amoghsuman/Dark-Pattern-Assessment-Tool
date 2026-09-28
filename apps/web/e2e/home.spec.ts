import { expect, test } from '@playwright/test';

test.describe('app shell', () => {
  test('shows navigation, organisation and the sample data badge', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Assessments' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.getByTestId('organization-name')).toHaveText('Example Life Insurance');
    await expect(page.getByRole('button', { name: 'Sample data options' })).toBeVisible();
  });

  test('theme toggle cycles to dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.getByRole('button', { name: /^System theme/ }).click(); // system → light
    await page.getByRole('button', { name: /^Light theme/ }).click(); // light → dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('serves evidence illustrations to signed-in users', async ({ request }) => {
    const response = await request.get('/evidence/web-quote-countdown.svg');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/svg+xml');
  });
});

test.describe('home', () => {
  test('lists assessments with status, progress and open risk', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Assessments' })).toBeVisible();

    const h1 = page.getByRole('row', { name: /Digital Journeys Review/ });
    await expect(h1.getByText('In review')).toBeVisible();
    await expect(h1.getByText('100%')).toBeVisible();
    await expect(h1.getByText(/\d+ Critical/)).toBeVisible();

    const renewal = page.getByRole('row', { name: /Renewal and Servicing Revamp/ });
    await expect(renewal.getByText('Running')).toBeVisible();
    await expect(renewal.getByText('50%')).toBeVisible();
  });

  test('filters by search text and status', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search assessments').fill('renewal');
    await expect(page.getByRole('row', { name: /Digital Journeys Review/ })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /Renewal and Servicing/ })).toBeVisible();

    await page.getByLabel('Search assessments').fill('');
    await page.getByRole('combobox', { name: 'Filter by status' }).click();
    await page.getByRole('option', { name: 'Completed' }).click();
    await expect(page.getByText('No assessments match your filters')).toBeVisible();
  });

  test('links running assessments to the run view and others to the overview', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Renewal and Servicing Revamp: Pre-launch' }),
    ).toHaveAttribute('href', '/assessments/asm-renewal-prelaunch/run');
    await expect(
      page.getByRole('link', { name: 'Digital Journeys Review, H1 FY2026-27' }),
    ).toHaveAttribute('href', '/assessments/asm-digital-h1');
  });
});
