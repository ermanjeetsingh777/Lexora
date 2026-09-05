import { test, expect } from '@playwright/test';
import { dismissOverlays } from '../fixtures/helpers';
import {
  branchTabs,
  clickDetailTab,
  exerciseTabs,
  institutionTabs,
  libraryTabs,
  memberTabs,
  openFirstEntity,
  visitNestedRoutes,
} from '../fixtures/detail-nav';

/**
 * Separate detail suites for EVERY entity feature:
 * Institution, Branch, Library, Member.
 * Each suite: open card → all tabs → nested routes.
 *
 * Run only these:
 *   npm run e2e:details
 *   npm run e2e:ui:details
 */

test.describe.configure({ timeout: 240_000 });

// ─── INSTITUTION ─────────────────────────────────────────────
test.describe('Institution details', () => {
  test('1) open institution card from list', async ({ page }) => {
    const entity = await openFirstEntity(page, '/institutions', 'institutions');
    test.skip(!entity, 'No institution cards in this environment');

    await expect(page).toHaveURL(/\/institutions\/[^/]+/);
    await expect(page.locator('main')).toBeVisible();
    expect(entity!.id.length).toBeGreaterThan(5);
  });

  test('2) open card and walk ALL institution tabs', async ({ page }) => {
    const entity = await openFirstEntity(page, '/institutions', 'institutions');
    test.skip(!entity, 'No institution cards');

    await exerciseTabs(page, `/institutions/${entity!.id}`, institutionTabs, true);
  });

  test('3) nested institution routes (addbranch / addlibrary / members create)', async ({ page }) => {
    const entity = await openFirstEntity(page, '/institutions', 'institutions');
    test.skip(!entity, 'No institution cards');

    const base = `/institutions/${entity!.id}`;
    await visitNestedRoutes(page, [
      `${base}/addbranch`,
      `${base}/addlibrary`,
      `${base}/members/create`,
    ]);
  });

  test('4) from institution Branches tab open first branch detail', async ({ page }) => {
    const entity = await openFirstEntity(page, '/institutions', 'institutions');
    test.skip(!entity, 'No institution cards');

    const base = `/institutions/${entity!.id}`;
    await page.goto(`${base}?tab=branches`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await clickDetailTab(page, 'Branches');

    const branchLink = page.locator(`a[href*="/institutions/${entity!.id}/branches/"]`).first();
    test.skip(
      !(await branchLink.isVisible({ timeout: 30_000 }).catch(() => false)),
      'No branch under this institution',
    );

    await branchLink.click();
    await dismissOverlays(page);
    await expect(page).toHaveURL(new RegExp(`/institutions/${entity!.id}/branches/[^/]+`));
    await expect(page.locator('main')).toBeVisible();
  });

  test('5) from institution Libraries tab open first library detail', async ({ page }) => {
    const entity = await openFirstEntity(page, '/institutions', 'institutions');
    test.skip(!entity, 'No institution cards');

    await page.goto(`/institutions/${entity!.id}?tab=libraries`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await clickDetailTab(page, 'Libraries');

    const libLink = page.locator('a[href*="/libraries/"]').first();
    test.skip(!(await libLink.isVisible({ timeout: 30_000 }).catch(() => false)), 'No library under institution');

    await libLink.click();
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL(/\/libraries\//);
  });
});

// ─── BRANCH ──────────────────────────────────────────────────
test.describe('Branch details', () => {
  test('1) open branch card from list', async ({ page }) => {
    const entity = await openFirstEntity(page, '/branches', 'branches');
    test.skip(!entity, 'No branch cards');

    await expect(page).toHaveURL(/\/branches\/[^/]+/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('2) open card and walk ALL branch tabs', async ({ page }) => {
    const entity = await openFirstEntity(page, '/branches', 'branches');
    test.skip(!entity, 'No branch cards');

    await exerciseTabs(page, `/branches/${entity!.id}`, branchTabs, true);
  });

  test('3) nested branch routes (edit / addlibrary / members create)', async ({ page }) => {
    const entity = await openFirstEntity(page, '/branches', 'branches');
    test.skip(!entity, 'No branch cards');

    const base = `/branches/${entity!.id}`;
    await visitNestedRoutes(page, [
      `${base}/edit`,
      `${base}/addlibrary`,
      `${base}/members/create`,
    ]);
  });

  test('4) from branch Libraries tab open first library', async ({ page }) => {
    const entity = await openFirstEntity(page, '/branches', 'branches');
    test.skip(!entity, 'No branch cards');

    await page.goto(`/branches/${entity!.id}?tab=libraries`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await clickDetailTab(page, 'Libraries');

    const libLink = page
      .locator(`a[href*="/branches/${entity!.id}/libraries/"], a[href*="/libraries/"]`)
      .first();
    test.skip(!(await libLink.isVisible({ timeout: 30_000 }).catch(() => false)), 'No library under branch');

    await libLink.click();
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
  });

  test('5) from branch Members tab open first member', async ({ page }) => {
    const entity = await openFirstEntity(page, '/branches', 'branches');
    test.skip(!entity, 'No branch cards');

    await page.goto(`/branches/${entity!.id}?tab=members`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await clickDetailTab(page, 'Members');

    const memberLink = page.locator('a[href*="/members/"]').first();
    test.skip(!(await memberLink.isVisible({ timeout: 30_000 }).catch(() => false)), 'No member under branch');

    await memberLink.click();
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveURL(/\/members\//);
  });
});

// ─── LIBRARY ─────────────────────────────────────────────────
test.describe('Library details', () => {
  test('1) open library card from list', async ({ page }) => {
    const entity = await openFirstEntity(page, '/libraries', 'libraries');
    test.skip(!entity, 'No library cards');

    await expect(page).toHaveURL(/\/libraries\/[^/]+/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('2) open card and walk ALL library tabs', async ({ page }) => {
    const entity = await openFirstEntity(page, '/libraries', 'libraries');
    test.skip(!entity, 'No library cards');

    await exerciseTabs(page, `/libraries/${entity!.id}`, libraryTabs, true);
  });

  test('3) nested library routes (edit / members create)', async ({ page }) => {
    const entity = await openFirstEntity(page, '/libraries', 'libraries');
    test.skip(!entity, 'No library cards');

    const base = `/libraries/${entity!.id}`;
    await visitNestedRoutes(page, [`${base}/edit`, `${base}/members/create`]);
  });

  test('4) seats tab + seat preview button', async ({ page }) => {
    const entity = await openFirstEntity(page, '/libraries', 'libraries');
    test.skip(!entity, 'No library cards');

    await page.goto(`/libraries/${entity!.id}?tab=seats`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await clickDetailTab(page, 'Seats');
    await expect(page.locator('main')).toBeVisible();

    const preview = page.getByRole('button', { name: /Full preview|Seat preview|preview/i });
    if (await preview.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await preview.click();
      await page.waitForTimeout(1_200);
    }
  });

  test('5) from library Members tab open first member + edit route', async ({ page }) => {
    const entity = await openFirstEntity(page, '/libraries', 'libraries');
    test.skip(!entity, 'No library cards');

    await page.goto(`/libraries/${entity!.id}?tab=members`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await clickDetailTab(page, 'Members');

    const memberLink = page
      .locator(`a[href*="/libraries/${entity!.id}/members/"], a[href*="/members/"]`)
      .first();
    test.skip(!(await memberLink.isVisible({ timeout: 30_000 }).catch(() => false)), 'No member under library');

    await memberLink.click();
    await dismissOverlays(page);
    await expect(page).toHaveURL(/\/members\//);
    await expect(page.locator('main')).toBeVisible();

    const href = page.url();
    const memberMatch = href.match(/\/members\/([^/?#]+)/);
    if (memberMatch?.[1]) {
      await visitNestedRoutes(page, [
        `/libraries/${entity!.id}/members/${memberMatch[1]}`,
        `/libraries/${entity!.id}/members/${memberMatch[1]}/edit`,
      ]);
    }
  });
});

// ─── MEMBER ──────────────────────────────────────────────────
test.describe('Member details', () => {
  test('1) open member row/card from list', async ({ page }) => {
    const entity = await openFirstEntity(page, '/members', 'members');
    test.skip(!entity, 'No member rows');

    await expect(page).toHaveURL(/\/members\/[^/]+/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('2) open member and walk ALL detail tabs', async ({ page }) => {
    const entity = await openFirstEntity(page, '/members', 'members');
    test.skip(!entity, 'No member rows');

    await page.goto(`/members/${entity!.id}`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);

    for (const tab of memberTabs) {
      const clicked = await clickDetailTab(page, tab.label);
      if (!clicked && tab.id === 'password') continue;
      await expect(page.locator('main')).toBeVisible();
      await page.waitForTimeout(800);
    }
  });

  test('3) member edit route + form fields', async ({ page }) => {
    const entity = await openFirstEntity(page, '/members', 'members');
    test.skip(!entity, 'No member rows');

    await page.goto(`/members/${entity!.id}/edit`, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('form, input, [formcontrolname]').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
