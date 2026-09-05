import { test, expect } from '@playwright/test';
import { e2eCredentials } from '../fixtures/routes';
import { dismissOverlays, loginViaUi } from '../fixtures/helpers';

test.describe('Auth flows', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('demo login reaches authenticated area', async ({ page }) => {
    await loginViaUi(page, e2eCredentials.email, e2eCredentials.password);
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator('app-shell, app-topbar, main').first()).toBeVisible();
  });

  test('invalid password shows error toast/message', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);

    await page.locator('#email').fill(e2eCredentials.email);
    await page.locator('#password').fill('WrongPassword!999');
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expect(
      page.getByText(/Unable to sign in|correct password|not registered|Invalid/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
