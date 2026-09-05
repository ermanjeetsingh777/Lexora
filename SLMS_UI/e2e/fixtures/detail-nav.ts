import { expect, type Page } from '@playwright/test';
import { dismissOverlays, E2E_TIMEOUTS, waitForApiAndUi } from './helpers';

export const institutionTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'branches', label: 'Branches' },
  { id: 'libraries', label: 'Libraries' },
  { id: 'members', label: 'Members' },
  { id: 'billing', label: 'Billing' },
  { id: 'settings', label: 'Settings' },
] as const;

export const branchTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'usage', label: 'Usage' },
  { id: 'libraries', label: 'Libraries' },
  { id: 'members', label: 'Members' },
  { id: 'staffing', label: 'Staffing' },
  { id: 'activity', label: 'Activity' },
] as const;

export const libraryTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'seats', label: 'Seats' },
  { id: 'members', label: 'Members' },
  { id: 'plans', label: 'Plans' },
  { id: 'profile', label: 'Profile' },
  { id: 'hours', label: 'Hours' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'sections', label: 'Sections' },
] as const;

export const memberTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'library-calendar', label: 'Library Calendar' },
  { id: 'books', label: 'Books' },
  { id: 'ebooks', label: 'E-Books' },
  { id: 'plans', label: 'Payments & Plans' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'password', label: 'Change Password' },
] as const;

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function idFromUrl(url: string, segment: string): string | null {
  const re = new RegExp(`/${segment}/(${UUID_RE.source}|[\\w-]{8,})`, 'i');
  return url.match(re)?.[1] ?? null;
}

function isEntityHref(href: string, segment: string): boolean {
  if (!href) return false;
  if (/\/(create|bulk-upload)(\/|$|\?)/i.test(href)) return false;
  if (new RegExp(`/${segment}/[^/]+/edit(\\?|$)`, 'i').test(href)) return false;
  return new RegExp(`/${segment}/[^/?#]+`, 'i').test(href);
}

/**
 * Wait until list shows at least one entity link (API data rendered).
 */
async function waitForListData(page: Page, segment: string): Promise<boolean> {
  const deadline = Date.now() + E2E_TIMEOUTS.api;
  while (Date.now() < deadline) {
    await waitForApiAndUi(page, { settleMs: 800 });
    const candidates = page.locator(`a[href*="/${segment}/"]`);
    const count = await candidates.count();
    for (let i = 0; i < count; i++) {
      const href = (await candidates.nth(i).getAttribute('href')) ?? '';
      if (isEntityHref(href, segment) && (await candidates.nth(i).isVisible().catch(() => false))) {
        return true;
      }
    }
    await page.waitForTimeout(1_500);
  }
  return false;
}

/**
 * List page → wait for API cards → click first entity.
 * segment: 'institutions' | 'branches' | 'libraries' | 'members'
 */
export async function openFirstEntity(
  page: Page,
  listPath: string,
  segment: string,
): Promise<{ url: string; id: string } | null> {
  await page.goto(listPath, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.navigation });
  await dismissOverlays(page);
  await waitForApiAndUi(page);

  const hasData = await waitForListData(page, segment);
  if (!hasData) {
    return null;
  }

  const candidates = page.locator(`a[href*="/${segment}/"]`);
  const count = await candidates.count();

  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    const href = (await el.getAttribute('href')) ?? '';
    if (!isEntityHref(href, segment)) continue;
    if (!(await el.isVisible().catch(() => false))) continue;

    await el.scrollIntoViewIfNeeded().catch(() => undefined);
    await el.click({ force: true });
    await page
      .waitForURL(new RegExp(`/${segment}/[^/]+`), { timeout: E2E_TIMEOUTS.navigation })
      .catch(() => undefined);
    await waitForApiAndUi(page);

    const url = page.url();
    const id = idFromUrl(url, segment);
    if (id) return { url, id };
  }

  return null;
}

export async function clickDetailTab(page: Page, label: string): Promise<boolean> {
  const byRole = page.getByRole('button', { name: new RegExp(`^${escapeRegex(label)}$`, 'i') });
  if (await byRole.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
    await byRole.first().click({ force: true });
    await waitForApiAndUi(page, { settleMs: 1_200 });
    return true;
  }

  const nav = page.locator('.inst-detail-tab-nav, .p-selectbutton, [role="group"]').first();
  const option = nav.getByText(new RegExp(`^${escapeRegex(label)}$`, 'i')).first();
  if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await option.click({ force: true });
    await waitForApiAndUi(page, { settleMs: 1_200 });
    return true;
  }

  return false;
}

export async function exerciseTabs(
  page: Page,
  basePath: string,
  tabs: readonly { id: string; label: string }[],
  useQueryParam = true,
): Promise<void> {
  await page.goto(basePath, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.navigation });
  await dismissOverlays(page);
  await waitForApiAndUi(page);
  await expect(page.locator('main')).toBeVisible({ timeout: E2E_TIMEOUTS.expect });

  for (const tab of tabs) {
    await clickDetailTab(page, tab.label);
    await expect(page.locator('main')).toBeVisible({ timeout: E2E_TIMEOUTS.expect });

    if (useQueryParam) {
      const url =
        tab.id === 'overview' ? basePath : `${basePath}?tab=${encodeURIComponent(tab.id)}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.navigation });
      await dismissOverlays(page);
      await waitForApiAndUi(page);
      await expect(page.locator('main')).toBeVisible({ timeout: E2E_TIMEOUTS.expect });
      if (tab.id !== 'overview') {
        expect(page.url()).toContain(`tab=${tab.id}`);
      }
    }
  }
}

export async function visitNestedRoutes(page: Page, routes: string[]): Promise<void> {
  for (const path of routes) {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: E2E_TIMEOUTS.navigation });
    await dismissOverlays(page);
    await waitForApiAndUi(page);
    await expect(page.locator('body')).toBeVisible({ timeout: E2E_TIMEOUTS.expect });
    expect(page.url()).not.toMatch(/\/login$/);
    await expect(page.locator('main').first()).toBeVisible({ timeout: E2E_TIMEOUTS.expect });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
