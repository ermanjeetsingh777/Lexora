import { test, expect } from '@playwright/test';
import { dismissOverlays } from '../fixtures/helpers';

test.describe('Attendance module', () => {
  const routes = [
    '/attendance',
    '/attendance/calendar',
    '/attendance/live',
    '/attendance/records',
    '/attendance/scanner',
  ];

  for (const path of routes) {
    test(`${path} loads`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await expect(page.locator('main')).toBeVisible();
    });
  }
});
