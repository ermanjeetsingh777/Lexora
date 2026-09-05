import { test, expect } from '@playwright/test';
import { dismissOverlays } from '../fixtures/helpers';

test.describe('Members module', () => {
  test('list page loads', async ({ page }) => {
    await page.goto('/members', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('create member form opens', async ({ page }) => {
    await page.goto('/members/create', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('form, input, [formcontrolname]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('bulk upload page opens', async ({ page }) => {
    await page.goto('/members/bulk-upload', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });
});
