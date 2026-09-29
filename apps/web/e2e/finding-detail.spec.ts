import { expect, test, type Page } from '@playwright/test';

const finding = (id: string) => `/assessments/asm-digital-h1/findings/${id}`;

async function actAs(page: Page, role: 'Admin' | 'Assessor' | 'Reviewer' | 'Viewer') {
  await page.getByRole('button', { name: 'Sample data options' }).click();
  await page.getByRole('menuitemradio', { name: new RegExp(`^${role}`) }).click();
  await expect(page.getByText(`Now acting as ${role}`)).toBeVisible();
}

test('screenshot viewer zooms, toggles boxes and links regions to criteria', async ({ page }) => {
  await page.goto(finding('fnd-h1-005'));
  await expect(
    page.getByRole('heading', {
      name: 'Critical Illness Rider is pre-selected in the proposal form',
    }),
  ).toBeVisible();
  await expect(page.getByTestId('rule-pack-version')).toHaveText('dp-02-basket-sneaking v0.1.0');

  const regions = page.getByRole('button', { name: /^Region \d:/ });
  await expect(regions).toHaveCount(2);

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByTestId('zoom-level')).toHaveText('150%');
  await expect(page.getByTestId('screenshot-layer')).toHaveAttribute('style', /scale\(1\.5\)/);
  await expect(regions.first()).toBeVisible();
  await page.getByRole('button', { name: 'Fit' }).click();
  await expect(page.getByTestId('zoom-level')).toHaveText('100%');

  await page.getByRole('button', { name: 'Hide boxes' }).click();
  await expect(regions).toHaveCount(0);
  await page.getByRole('button', { name: 'Show boxes' }).click();

  await page
    .getByRole('list', { name: 'Annotated regions' })
    .getByRole('button', { name: /Pre-ticked paid rider/ })
    .click();
  const criterion = page
    .getByRole('list', { name: 'Violation criteria' })
    .getByRole('listitem')
    .filter({ hasText: 'BS-C-3' });
  await expect(criterion).toHaveClass(/border-matrix-non-compliant/);
});

test('code evidence is highlighted with real file line numbers', async ({ page }) => {
  await page.goto(finding('fnd-h1-006'));
  await expect(page.getByText('web/src/features/proposal/ProposalFormState.ts')).toBeVisible();
  const highlighted = page.locator('.code-viewer .line.highlighted');
  await expect(highlighted).toHaveCount(1);
  await expect(highlighted).toHaveAttribute('data-line', '21');
  await expect(highlighted).toContainText('criticalIllnessRider: true');
});

test('multiple evidence items appear as tabs', async ({ page }) => {
  await page.goto(finding('fnd-h1-025'));
  await expect(page.getByRole('tab', { name: 'pricing-rules.yaml' })).toBeVisible();
  await page.getByRole('tab', { name: 'PremiumCalculator.java' }).click();
  await expect(page.locator('.code-viewer .line[data-line="90"]')).toContainText(
    'feeRules.forStep',
  );
});

test('reviewers confirm findings and the audit trail records it', async ({ page }) => {
  await page.goto(finding('fnd-h1-003'));
  await actAs(page, 'Reviewer');
  await page.getByLabel('Note for the audit trail').fill('Confirmed with the web team');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('ELI-2026-003 is now Confirmed')).toBeVisible();

  const trail = page.getByRole('list', { name: 'Audit trail' });
  await expect(trail.getByRole('listitem').first()).toContainText('Under Review');
  await expect(trail.getByRole('listitem').first()).toContainText('Confirmed with the web team');
  await expect(trail.getByRole('listitem').first()).toContainText('Kavya Iyer');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Start remediation' })).toBeVisible();
});

test('actions follow the role', async ({ page }) => {
  await page.goto(finding('fnd-h1-008'));
  await actAs(page, 'Assessor');
  await expect(page.getByRole('button', { name: 'Start review' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dismiss' })).toHaveCount(0);

  await actAs(page, 'Viewer');
  await expect(page.getByText('Viewers cannot change status.')).toBeVisible();
  await expect(page.getByLabel('Add a comment')).toHaveCount(0);
});

test('comments are added and correlated findings link across engines', async ({ page }) => {
  await page.goto(finding('fnd-h1-001'));
  await page.getByLabel('Add a comment').fill('Retest scheduled for next sprint.');
  await page.getByRole('button', { name: 'Comment' }).click();
  await expect(page.getByRole('list', { name: 'Comments' })).toContainText(
    'Retest scheduled for next sprint.',
  );

  await page
    .getByRole('list', { name: 'Correlated findings' })
    .getByRole('link', { name: /ELI-2026-002/ })
    .click();
  await expect(page.getByTestId('finding-reference')).toHaveText('ELI-2026-002');
  const tabs = page.getByRole('navigation', { name: 'Assessment sections' });
  await expect(tabs.getByRole('link', { name: 'Findings' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
