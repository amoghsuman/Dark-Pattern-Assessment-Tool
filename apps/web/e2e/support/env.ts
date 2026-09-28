/** Passcode the Playwright web server is started with (see playwright.config.ts). */
export const TEST_PASSCODE = process.env.SITE_PASSCODE ?? 'playwright-passcode';

/** Signed-in browser state written by auth.setup.ts and reused by authenticated specs. */
export const AUTH_STATE_PATH = 'e2e/.auth/state.json';
