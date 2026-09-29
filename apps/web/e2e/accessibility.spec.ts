import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Automated WCAG 2.1 AA checks on every main screen, in light and dark themes. */
const PAGES: [string, string][] = [
  ['Home', '/'],
  ['Overview', '/assessments/asm-digital-h1'],
  ['Run', '/assessments/asm-digital-h1/run'],
  ['Compliance matrix', '/assessments/asm-digital-h1/matrix'],
  ['Findings', '/assessments/asm-digital-h1/findings'],
  ['Finding detail', '/assessments/asm-digital-h1/findings/fnd-h1-005'],
  ['Rule library', '/rules'],
  ['Rule pack', '/rules/nagging'],
  ['Report', '/assessments/asm-digital-h1/report'],
  ['New assessment', '/assessments/new'],
  ['Settings', '/settings?tab=users'],
];

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, path] of PAGES) {
    test(`${name} has no serious accessibility violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Evidence screenshots are illustrations of third-party screens, not app UI.
        .exclude('img[src^="/evidence/"]')
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      const summary = serious.map(
        (v) =>
          `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(' '))
            .join(' | ')}`,
      );
      expect(summary).toEqual([]);
    });
  }
}

test('access page is accessible', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto('/access');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
  await context.close();
});
