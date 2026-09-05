import { defineConfig, devices } from '@playwright/test';

/**
 * Lexora (SLMS_UI) Playwright E2E — all modules.
 *
 * Prerequisites:
 *   ng serve          (http://localhost:4200)
 *   API running       (local or configured via E2E_API_URL)
 *
 * Run:
 *   npm run e2e
 *   npm run e2e:ui
 *   npm run e2e:headed
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  /** Slow API / cold start — allow long flows (especially entity details). */
  timeout: 180_000,
  expect: { timeout: 45_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    // Runs first to save login cookies — not the main feature suite
    {
      name: 'auth-setup',
      testMatch: /.*\.setup\.ts/,
    },
    // ALL authenticated feature modules (Dashboard, Members, Attendance, …)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['auth-setup'],
      testMatch: /modules\/.*\.spec\.ts/,
    },
    // Public landing / auth / kiosk (no login storage)
    {
      name: 'public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /public\/.*\.spec\.ts/,
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run start:local',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
