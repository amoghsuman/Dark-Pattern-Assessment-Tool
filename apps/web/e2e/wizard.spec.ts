import { expect, test } from '@playwright/test';

test('blocks progress until the scope step is valid', async ({ page }) => {
  await page.goto('/assessments/new');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Enter a name of at least 3 characters.')).toBeVisible();
  await expect(page.getByText('Choose at least one target type.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Scope' })).toBeVisible();
});

test('creates an assessment end to end and runs it', async ({ page }) => {
  await page.goto('/assessments/new');

  // 1. Scope
  await page.getByLabel('Assessment name').fill('Motor renewal journeys');
  await page.getByText('Website', { exact: true }).click();
  await page.getByText('Code repository', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // 2. Target details
  await expect(page.getByRole('heading', { level: 2, name: 'Target details' })).toBeVisible();
  await page.getByLabel('Base URL').fill('https://motor.examplelife.example');
  await page.getByLabel('Name', { exact: true }).nth(1).fill('Motor platform');
  await page.getByRole('button', { name: 'Next' }).click();

  // 3. Uploads: a code target without a repository URL needs a source archive.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/Add a source archive/)).toBeVisible();
  await page.getByLabel('Choose files to upload').setInputFiles({
    name: 'motor-platform-src.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('sample'),
  });
  await expect(page.getByRole('list', { name: 'Selected files' })).toContainText(
    'motor-platform-src.zip',
  );
  await page.getByRole('button', { name: 'Next' }).click();

  // 4. Journeys: start from the template, then edit a step.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Add at least one journey for the website.')).toBeVisible();
  await page.getByRole('button', { name: 'Website template' }).click();
  await page.getByLabel('Step 2 value').fill('41');
  await page.getByRole('button', { name: 'Move step 5 up' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // 5. Patterns and stages: all patterns preselected, stages defaulted from journey tags.
  await expect(page.getByText('Dark patterns (13 of 13)')).toBeVisible();
  await expect(page.getByLabel('Quote and Comparison')).toBeChecked();
  await expect(page.getByLabel('Proposal and Onboarding')).toBeChecked();
  await expect(page.getByLabel('Claims')).not.toBeChecked();
  await page.getByLabel('Rogue Malware').click();
  await page.getByRole('button', { name: 'Next' }).click();

  // 6. Review and launch
  await expect(page.getByText('Motor renewal journeys')).toBeVisible();
  await expect(page.getByText(/1 journey\(s\), 7 steps, 2 screen capture\(s\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Launch assessment' }).click();

  await expect(page).toHaveURL(/\/assessments\/asm-[^/]+\/run$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Motor renewal journeys' }),
  ).toBeVisible();
  await expect(page.getByTestId('engine-correlation')).toHaveAttribute('data-status', 'succeeded', {
    timeout: 30_000,
  });
  await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible();

  await page.goto('/');
  const row = page.getByRole('row', { name: /Motor renewal journeys/ });
  await expect(row.getByText('In review')).toBeVisible();
  await expect(row.getByText('100%')).toBeVisible();
});

test('restores an unfinished draft after leaving the page', async ({ page }) => {
  await page.goto('/assessments/new');
  await page.getByLabel('Assessment name').fill('Half-finished draft');
  await page.getByText('Mobile app', { exact: true }).click();
  await page.goto('/');
  await page.goto('/assessments/new');
  await expect(page.getByText('Restored your unfinished draft.')).toBeVisible();
  await expect(page.getByLabel('Assessment name')).toHaveValue('Half-finished draft');

  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByLabel('Assessment name')).toHaveValue('');
});

test('viewers cannot create assessments', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sample data options' }).click();
  await page.getByRole('menuitemradio', { name: /^Viewer/ }).click();
  await page.goto('/assessments/new');
  await expect(page.getByText(/Only admins and assessors can create assessments/)).toBeVisible();
});
