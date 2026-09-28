import { expect, test as setup } from '@playwright/test';

import { AUTH_STATE_PATH, TEST_PASSCODE } from './support/env';

setup('unlock the access gate', async ({ page }) => {
  await page.goto('/access');
  await page.getByLabel('Passcode').fill(TEST_PASSCODE);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL('/');
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
