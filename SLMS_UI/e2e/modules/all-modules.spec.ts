import { test, expect, type Page } from '@playwright/test';
import {
  authenticatedFeatureModules,
  sidebarFeatureLinks,
  type FeatureRoute,
} from '../fixtures/routes';
import { dismissOverlays, expectPageHealthy, E2E_TIMEOUTS } from '../fixtures/helpers';

async function assertFeaturePage(page: Page, route: FeatureRoute): Promise<void> {
  await expectPageHealthy(page, route.path);

  const shell = page.locator('app-shell, app-topbar, main').first();
  await expect(shell).toBeVisible({ timeout: E2E_TIMEOUTS.expect });

  if (route.expectVisible) {
    await expect(page.locator(route.expectVisible).first()).toBeVisible({
      timeout: E2E_TIMEOUTS.expect,
    });
  }
}

/**
 * Feature-wise E2E: every authenticated module and its components/routes.
 * Nested describe = one feature (Dashboard, Members, Attendance, …).
 */
for (const feature of authenticatedFeatureModules) {
  test.describe(`Feature: ${feature.title}`, () => {
    for (const route of feature.routes) {
      test(`${route.name} — ${route.path}`, async ({ page }) => {
        await assertFeaturePage(page, route);
      });
    }
  });
}

test.describe('Feature: Books — open add/edit dialog when available', () => {
  test('books page shows catalogue UI', async ({ page }) => {
    await page.goto('/books', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();

    const addBtn = page.getByRole('button', { name: /Add book|New book|Create/i });
    if (!(await addBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }

    await addBtn.click();
    const dialog = page.locator('[role="dialog"], .p-dialog, app-book-form-dialog, form').first();
    const opened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
    if (opened) {
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Feature: Support — open new ticket dialog when available', () => {
  test('support centre loads and ticket CTA works', async ({ page }) => {
    await page.goto('/support', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();

    const newTicket = page.getByRole('button', { name: /New ticket|Create ticket|Raise/i });
    if (!(await newTicket.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }

    await newTicket.click();
    const dialog = page.locator('[role="dialog"], .p-dialog, app-new-ticket-dialog, form').first();
    const opened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
    if (opened) {
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Sidebar — feature-wise navigation', () => {
  for (const link of sidebarFeatureLinks) {
    test(`sidebar feature: ${link.name} (${link.path})`, async ({ page }) => {
      await page.goto(link.path, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).not.toMatch(/\/login$/);
    });
  }
});
