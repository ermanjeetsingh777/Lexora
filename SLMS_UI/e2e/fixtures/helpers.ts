import { expect, type Page } from '@playwright/test';

/** Default waits — API + Angular render often need longer than Playwright defaults. */
export const E2E_TIMEOUTS = {
  /** Single expect / locator visible */
  expect: 45_000,
  /** Click / fill actions */
  action: 30_000,
  /** page.goto / navigation */
  navigation: 60_000,
  /** Wait for XHR/fetch + UI settle */
  api: 60_000,
  /** Login API + redirect */
  login: 90_000,
  /** After navigation, extra settle for list/detail data */
  settle: 2_000,
  /** globalLoader / skeleton max wait */
  loader: 45_000,
} as const;

/** Dismiss policy + PWA banners if present (non-blocking). */
export async function dismissOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('lexora_policy_consent_accepted_v1', 'true');
  }).catch(() => undefined);

  const accept = page.getByRole('button', { name: /Accept & Continue/i });
  if (await accept.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await accept.click({ force: true }).catch(() => undefined);
  }

  const notNow = page.getByRole('button', { name: /Not now/i });
  if (await notNow.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await notNow.click({ force: true }).catch(() => undefined);
  }

  await page.evaluate(() => {
    document.querySelectorAll('app-pwa-install-banner, app-policy-consent-banner').forEach((el) => {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    });
  }).catch(() => undefined);
}

/**
 * Wait until API-driven UI is ready:
 * 1) networkidle (or timeout)
 * 2) globalLoader gone / not blocking
 * 3) short settle for Angular change detection
 */
export async function waitForApiAndUi(page: Page, options?: { settleMs?: number }): Promise<void> {
  const settleMs = options?.settleMs ?? E2E_TIMEOUTS.settle;

  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: E2E_TIMEOUTS.api }).catch(() => undefined);

  // Wait for global loader to finish (do NOT force-hide — data may still be loading)
  await page
    .waitForFunction(
      () => {
        const loader = document.getElementById('globalLoader');
        if (!loader) return true;
        const style = window.getComputedStyle(loader);
        const hidden =
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) < 0.05 ||
          loader.classList.contains('global-loader-fade-out') ||
          loader.classList.contains('hidden');
        return hidden || style.pointerEvents === 'none';
      },
      { timeout: E2E_TIMEOUTS.loader },
    )
    .catch(() => undefined);

  // Common skeleton / spinner patterns
  await page
    .locator('.global-loader:not(.global-loader-fade-out)')
    .first()
    .waitFor({ state: 'hidden', timeout: E2E_TIMEOUTS.loader })
    .catch(() => undefined);

  await page.waitForTimeout(settleMs);
  await dismissOverlays(page);
}

/** Assert page loaded + API data had time to appear. */
export async function expectPageHealthy(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.navigation });
  await dismissOverlays(page);
  await waitForApiAndUi(page);
  await expect(page.locator('body')).toBeVisible({ timeout: E2E_TIMEOUTS.expect });

  const url = page.url();
  const redirectedToLogin = /\/login/.test(url);
  const redirectedUnauthorized = /\/unauthorized/.test(url);
  const stayedOnRoute = url.includes(path.split('?')[0]) || path === '/';

  expect(
    redirectedToLogin ||
      redirectedUnauthorized ||
      stayedOnRoute ||
      /\/dashboard|\/onboarding|\/pending-approval/.test(url),
    `Unexpected navigation for ${path} → ${url}`,
  ).toBeTruthy();

  const fatal = page.locator('text=/Application error|Cannot match any routes|NullInjectorError/i');
  await expect(fatal).toHaveCount(0);
}

/** Login via UI form (Angular signals / ngModel). */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.navigation });
  await dismissOverlays(page);
  await waitForApiAndUi(page, { settleMs: 800 });

  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  await emailInput.click();
  await emailInput.fill('');
  await emailInput.pressSequentially(email, { delay: 8 });
  await passwordInput.click();
  await passwordInput.fill('');
  await passwordInput.pressSequentially(password, { delay: 8 });

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/auth/login') && res.request().method() === 'POST',
    { timeout: E2E_TIMEOUTS.login },
  );

  await page.getByRole('button', { name: /^Sign in$/i }).click();
  const response = await loginResponse;
  const body = await response.json().catch(() => ({} as { success?: boolean; message?: string }));

  if (!response.ok() || body.success === false) {
    throw new Error(`Login failed (${response.status()}): ${body.message ?? response.statusText()}`);
  }

  await page.waitForURL(/dashboard|onboarding|pending-approval|members/, {
    timeout: E2E_TIMEOUTS.login,
  });
  await waitForApiAndUi(page);
  await dismissOverlays(page);
}
