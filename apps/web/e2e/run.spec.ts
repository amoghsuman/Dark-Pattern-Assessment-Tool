import { expect, test } from '@playwright/test';

test('a completed run opens at its final state and can be replayed', async ({ page }) => {
  await page.goto('/assessments/asm-digital-h1/run');
  await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible();
  await expect(page.getByText('5 of 5 engines complete')).toBeVisible();
  const engines = page.getByRole('list', { name: 'Analysis engines' });
  await expect(engines.getByText('Ran 39 deterministic checks across 13 rule packs')).toBeVisible();
  await expect(page.getByTestId('engine-backend_logic')).toContainText('9 findings');

  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByTestId('engine-correlation')).toHaveAttribute('data-status', 'pending');
  await expect(page.getByTestId('engine-correlation')).toHaveAttribute('data-status', 'succeeded', {
    timeout: 30_000,
  });
  await expect(page.getByRole('link', { name: 'View overview' })).toBeVisible();
});

test('a running assessment streams to its current state', async ({ page }) => {
  await page.goto('/assessments/asm-renewal-prelaunch/run');
  await expect(page.getByTestId('engine-code_analysis')).toHaveAttribute('data-status', 'running', {
    timeout: 25_000,
  });
  await expect(page.getByTestId('engine-screen_capture')).toHaveAttribute(
    'data-status',
    'succeeded',
  );
  await expect(page.getByTestId('engine-backend_logic')).toHaveAttribute('data-status', 'pending');
  await expect(page.getByText('Analysis in progress', { exact: true })).toBeVisible();
  await expect(page.getByText(/2 steps blocked by UAT login timeout/)).toBeVisible();
});

test('assessment tabs mark the current section', async ({ page }) => {
  await page.goto('/assessments/asm-digital-h1/run');
  const tabs = page.getByRole('navigation', { name: 'Assessment sections' });
  await expect(tabs.getByRole('link', { name: 'Run' })).toHaveAttribute('aria-current', 'page');
  await expect(tabs.getByRole('link', { name: 'Overview' })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('unknown assessments show a not-found state', async ({ page }) => {
  await page.goto('/assessments/asm-does-not-exist/run');
  await expect(page.getByText('Assessment not found')).toBeVisible();
});
