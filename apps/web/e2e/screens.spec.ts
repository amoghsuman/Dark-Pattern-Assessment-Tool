import { mkdirSync } from 'node:fs';

import { test } from '@playwright/test';

/**
 * Captures key screens for visual review. CI uploads the `screens/` folder as an artifact; the
 * spec asserts nothing beyond the pages loading.
 */
const PAGES: [string, string][] = [
  ['home', '/'],
  ['overview', '/assessments/asm-digital-h1'],
  ['matrix', '/assessments/asm-digital-h1/matrix?pattern=drip_pricing&stage=stg-payment'],
  ['findings', '/assessments/asm-digital-h1/findings'],
  ['finding-screenshot', '/assessments/asm-digital-h1/findings/fnd-h1-005'],
  ['finding-code', '/assessments/asm-digital-h1/findings/fnd-h1-025'],
  ['rules', '/rules'],
  ['rule-pack', '/rules/drip_pricing'],
  ['report', '/assessments/asm-digital-h1/report'],
  ['wizard', '/assessments/new'],
  ['settings', '/settings?tab=stages'],
];

test.describe.configure({ mode: 'serial' });

for (const scheme of ['light', 'dark'] as const) {
  test(`capture screens (${scheme})`, async ({ page }, info) => {
    test.setTimeout(120_000);
    mkdirSync('screens', { recursive: true });
    await page.emulateMedia({ colorScheme: scheme });
    for (const [name, path] of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `screens/${info.project.name}-${scheme}-${name}.png`,
        fullPage: name === 'report',
      });
    }
  });
}
