import { test, expect } from '@playwright/test';
import { dismissOverlays } from '../fixtures/helpers';

test.describe('Books, admin, profile, support', () => {
  test('books list', async ({ page }) => {
    await page.goto('/books', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('users admin', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('roles admin', async ({ page }) => {
    await page.goto('/roles', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin approvals', async ({ page }) => {
    await page.goto('/admin/approvals', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('profile', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('support centre', async ({ page }) => {
    await page.goto('/support', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('support status', async ({ page }) => {
    await page.goto('/support/status', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });
});
