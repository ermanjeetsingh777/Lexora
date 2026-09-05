import { test, expect } from '@playwright/test';
import { dismissOverlays } from '../fixtures/helpers';

test.describe('Organization modules', () => {
  test('institutions list', async ({ page }) => {
    await page.goto('/institutions', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('create institution', async ({ page }) => {
    await page.goto('/institutions/create', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('branches list', async ({ page }) => {
    await page.goto('/branches', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('create branch', async ({ page }) => {
    await page.goto('/branches/create', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('libraries list', async ({ page }) => {
    await page.goto('/libraries', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('create library', async ({ page }) => {
    await page.goto('/libraries/create', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('subscriptions', async ({ page }) => {
    await page.goto('/subscriptions', { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });
});
