import { expect, test, type Page } from '@playwright/test';

import { apkFile, pngFile, textFile } from './support/files';

const SHA = 'a3f9c21e8b4d7c2f5a6e9d0b1c4f7a8e2d5b6c9f';

async function next(page: Page) {
  await page.getByRole('button', { name: 'Next' }).click();
}

test('blocks progress until the scope step is valid', async ({ page }) => {
  await page.goto('/assessments/new');
  await next(page);
  await expect(page.getByText('Enter a name of at least 3 characters.')).toBeVisible();
  await expect(page.getByText('Choose at least one target.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Scope' })).toBeVisible();
});

test('captures every input, validates it and launches with an acknowledged checklist', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/assessments/new');

  // 1. Scope
  await page.getByLabel('Assessment name').fill('Motor renewal journeys');
  for (const kind of ['Website', 'Android app', 'Source code', 'Backend configuration']) {
    await page.getByText(kind, { exact: true }).click();
  }
  await next(page);

  // 2. Targets: website
  await expect(page.getByRole('heading', { level: 2, name: 'Targets and inputs' })).toBeVisible();
  await page.getByLabel('Base URL').fill('https://uat.motor.examplelife.example');
  await page.getByLabel('Environment label').fill('UAT-2');
  await page.getByLabel('Label', { exact: true }).fill('Test customer login');
  await page.getByLabel('Username', { exact: true }).fill('qa.customer01');
  await page.getByLabel('Password', { exact: true }).fill('Sup3r-secret-42');
  await page.getByRole('button', { name: 'Add credential' }).click();
  const credentials = page.getByRole('list', { name: 'Stored credentials' });
  await expect(credentials).toContainText('••••42');
  await expect(credentials).toContainText('Not stored (sample mode)');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await page.getByRole('checkbox', { name: 'Use Test customer: salaried, 34' }).click();
  await page.getByRole('checkbox', { name: 'Use Payment gateway sandbox' }).click();
  await page.getByText('Live assessor entry', { exact: true }).click();

  // Android: an invalid file is rejected; a real APK fills in the package name and version.
  await page
    .getByLabel('Upload the Android build')
    .setInputFiles(textFile('broken.apk', 'not a zip'));
  await expect(page.getByText(/broken\.apk is not a valid APK or AAB/)).toBeVisible();
  await page
    .getByLabel('Upload the Android build')
    .setInputFiles(apkFile('com.examplelife.motor', '2.1.0'));
  await expect(page.getByText('Package name read from the file')).toBeVisible();
  await expect(page.getByLabel('Package name')).toHaveValue('com.examplelife.motor');
  await expect(page.getByText(/SHA-256 [0-9a-f]{16}…/).first()).toBeVisible();

  // Source: pinned commit is mandatory
  await page.getByLabel('Name', { exact: true }).nth(2).fill('Motor platform');
  await page.getByLabel('Repository URL').fill('https://github.com/examplelife/motor');
  await page.getByLabel('Pinned commit SHA').fill('a3f9c21');
  await next(page);
  await expect(
    page.getByText('Pin the full 40-character commit SHA for audit traceability.'),
  ).toBeVisible();
  await page.getByLabel('Pinned commit SHA').fill(SHA);
  await page.getByLabel('Read-only access token').fill('glpat-read-only-token-xyz');
  await page.getByRole('button', { name: 'Store token' }).click();
  await page.getByRole('checkbox', { name: 'The token has read-only scope' }).click();

  // Backend configuration: every file needs a type
  await page
    .getByLabel('Upload configuration files')
    .setInputFiles([
      textFile('pricing-rules.yaml', 'fees: []'),
      textFile('reminders.yaml', 'jobs: []'),
    ]);
  await next(page);
  await expect(page.getByText('Tag every configuration file with its type.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Type of pricing-rules.yaml' }).click();
  await page.getByRole('option', { name: 'Pricing and fee rules' }).click();
  await page.getByRole('combobox', { name: 'Type of reminders.yaml' }).click();
  await page.getByRole('option', { name: 'Notification schedule' }).click();
  await next(page);

  // 3. Journeys
  await page.getByRole('button', { name: 'Website template' }).click();
  await page.getByRole('button', { name: 'Android app template' }).click();
  await next(page);

  // 4. Manual captures: stage and note required
  await page
    .getByLabel('Upload manual screenshots or recordings')
    .setInputFiles(pngFile('otp-screen.png'));
  await next(page);
  await expect(page.getByText(/Capture 1: choose a journey stage/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Stage for capture 1' }).click();
  await page.getByRole('option', { name: 'Proposal and Onboarding' }).click();
  await page.getByLabel('Note for capture 1').fill('Captured manually: OTP-gated screen');
  await next(page);

  // 5. Patterns, stages and exclusions
  await page.getByLabel('Payment', { exact: true }).check();
  await page.getByRole('button', { name: 'Add exclusion' }).click();
  await page.getByRole('combobox', { name: 'Stage for exclusion 1' }).click();
  await page.getByRole('option', { name: 'Payment' }).click();
  await page
    .getByLabel('Reason for exclusion 1')
    .fill('Payment gateway pages hosted by a third party');
  await next(page);

  // 6. Review: checklist and acknowledgement
  await expect(page.getByTestId('client-access-summary')).toContainText('outstanding');
  const config = page.getByRole('list', { name: 'Backend configuration access' });
  await expect(config.getByRole('listitem').filter({ hasText: 'CMS export' })).toHaveAttribute(
    'data-status',
    'outstanding',
  );
  await expect(
    config.getByRole('listitem').filter({ hasText: 'Pricing and fee rules' }),
  ).toHaveAttribute('data-status', 'provided');
  await page.getByRole('button', { name: 'Launch assessment' }).click();
  await expect(page.getByText('Some client access items are outstanding')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Launch with outstanding items' }).click();
  await page.getByRole('button', { name: 'Launch assessment' }).click();

  await expect(page).toHaveURL(/\/assessments\/asm-[^/]+\/run$/);
  await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible({
    timeout: 45_000,
  });

  // Inputs and exclusions are recorded on the assessment
  await page
    .getByRole('navigation', { name: 'Assessment sections' })
    .getByRole('link', { name: 'Overview' })
    .click();
  const inputs = page.getByRole('table', { name: 'Inputs received' });
  await expect(inputs).toContainText('motor-release.apk');
  await expect(inputs).toContainText('Pricing and fee rules');
  await expect(inputs).toContainText('Captured manually: OTP-gated screen');
  await expect(page.getByText('Launched with outstanding items.')).toBeVisible();
  await expect(page.getByText(/Payment gateway pages hosted by a third party/)).toBeVisible();
});

test('iOS builds require the decrypted-build confirmation', async ({ page }) => {
  await page.goto('/assessments/new');
  await page.getByLabel('Assessment name').fill('iOS check');
  await page.getByText('iOS app', { exact: true }).click();
  await next(page);
  await page.getByLabel('Upload the decrypted iOS build').setInputFiles({
    name: 'motor.ipa',
    mimeType: 'application/octet-stream',
    buffer: apkFile('com.examplelife.motor', '2.1.0').buffer,
  });
  await page.getByLabel('Bundle ID').fill('com.examplelife.motor');
  await page.getByLabel('Version').fill('2.1.0');
  await next(page);
  await expect(
    page.getByText('Confirm this IPA is a decrypted build supplied by the client.').first(),
  ).toBeVisible();
  await page
    .getByRole('checkbox', { name: 'This IPA is a decrypted build supplied by the client' })
    .click();
  await next(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Journeys' })).toBeVisible();
});

test('restores an unfinished draft after leaving the page', async ({ page }) => {
  await page.goto('/assessments/new');
  await page.getByLabel('Assessment name').fill('Half-finished draft');
  await page.getByText('Android app', { exact: true }).click();
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
