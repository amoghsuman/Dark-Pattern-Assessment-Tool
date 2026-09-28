import { defineConfig, devices } from '@playwright/test';

import { AUTH_STATE_PATH } from './e2e/support/env';

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

// Call the Next.js binary directly (it is on PATH under `pnpm e2e`) rather than through
// `pnpm start`: a server started via a pnpm wrapper can outlive Playwright's shutdown on
// Linux, which keeps the run from exiting. CI builds in its own step before tests.
const serverCommand = isCI
  ? `next start --port ${PORT}`
  : `next build && next start --port ${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Hard ceiling so a stuck run fails fast instead of hanging the CI job.
  globalTimeout: isCI ? 10 * 60_000 : 0,
  // Production server actions can take a few seconds under parallel load.
  expect: { timeout: 10_000 },
  reporter: isCI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE_PATH },
      dependencies: ['setup'],
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    // Production build gives stable timings; locally, reuse a server that is already running.
    command: serverCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    timeout: 240_000,
    env: {
      DATA_SOURCE: 'sample',
      SITE_PASSCODE: process.env.SITE_PASSCODE ?? 'playwright-passcode',
    },
  },
});
