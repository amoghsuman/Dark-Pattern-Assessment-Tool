import { expect, test } from '@playwright/test';

test('responses carry security headers', async ({ request }) => {
  const response = await request.get('/access', { maxRedirects: 0 });
  const headers = response.headers();
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-robots-tag']).toBe('noindex, nofollow');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('robots.txt disallows crawling without a session', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const response = await context.request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Disallow: /');
  await context.close();
});

test('unknown routes show the not-found page', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to assessments' }).click();
  await expect(page).toHaveURL('/');
});
