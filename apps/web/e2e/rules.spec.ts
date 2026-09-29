import { expect, test } from '@playwright/test';

test('rule library lists all 13 draft packs and filters by search', async ({ page }) => {
  await page.goto('/rules');
  await expect(page.getByText('Draft, pending compliance review.')).toBeVisible();
  const packs = page.getByRole('list', { name: 'Rule packs' }).getByRole('listitem');
  await expect(packs).toHaveCount(13);
  await page.getByLabel('Search rule packs').fill('countdown');
  await expect(packs).toHaveCount(1);
  await expect(packs.first()).toContainText('False Urgency');
});

test('rule pack detail shows every section', async ({ page }) => {
  await page.goto('/rules/drip_pricing');
  await expect(page.getByRole('heading', { level: 1, name: /Drip Pricing/ })).toBeVisible();
  await expect(page.getByText(/Guideline 4 read with Annexure 1, item 8/)).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Violation criteria' }).getByRole('listitem'),
  ).toHaveCount(3);
  for (const heading of [
    'Definition',
    'Violation criteria',
    'Detection signals',
    'Deterministic checks',
    'Review rubric (AI-assisted analysis)',
    'Severity logic',
    'Evidence required',
    'Remediation template',
    'Sector variants',
  ]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.getByRole('tab', { name: /Backend/ }).click();
  await expect(page.getByText('DP-SIG-BE-1')).toBeVisible();
  await page.getByRole('tab', { name: 'lending' }).click();
  await expect(page.getByText(/key fact statement/)).toBeVisible();
  await page.getByRole('link', { name: 'Disguised Advertisement' }).click();
  await expect(page).toHaveURL('/rules/disguised_advertisement');
});

test('unknown rule packs return not found', async ({ page }) => {
  const response = await page.goto('/rules/dark_mode');
  expect(response?.status()).toBe(404);
});

test('finding pages link to their rule pack', async ({ page }) => {
  await page.goto('/assessments/asm-digital-h1/findings/fnd-h1-029');
  await page.getByRole('link', { name: 'Open rule pack' }).click();
  await expect(page).toHaveURL('/rules/nagging');
  await expect(page.getByRole('link', { name: 'Rule library' }).first()).toBeVisible();
});
