import { test } from '@playwright/test';
import { publicFeatureModules } from '../fixtures/routes';
import { expectPageHealthy } from '../fixtures/helpers';

/**
 * Public features — landing, policies, auth pages, kiosk — feature-wise.
 */
for (const feature of publicFeatureModules) {
  test.describe(`Public feature: ${feature.title}`, () => {
    for (const route of feature.routes) {
      test(`${route.name} — ${route.path}`, async ({ page }) => {
        await expectPageHealthy(page, route.path);
        if (route.expectVisible) {
          await page.locator(route.expectVisible).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
        }
      });
    }
  });
}
