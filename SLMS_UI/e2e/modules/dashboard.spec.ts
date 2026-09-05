import { test, expect } from '@playwright/test';
import { dismissOverlays } from '../fixtures/helpers';

test.describe('Dashboard module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
  });

  test('overview renders main content', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });

  const tabs = [
    '/dashboard/analytics',
    '/dashboard/occupancy',
    '/dashboard/revenue',
    '/dashboard/attendance',
    '/dashboard/subscriptions',
    '/dashboard/notifications',
    '/dashboard/activity',
  ];

  for (const path of tabs) {
    test(`tab ${path} opens`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await expect(page.locator('main')).toBeVisible();
      expect(page.url()).toContain(path);
    });
  }
});
