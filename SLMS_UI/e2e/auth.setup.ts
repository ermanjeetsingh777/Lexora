import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import { e2eCredentials } from './fixtures/routes';
import { dismissOverlays, loginViaUi } from './fixtures/helpers';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate demo org admin', async ({ page }) => {
  await loginViaUi(page, e2eCredentials.email, e2eCredentials.password);
  await dismissOverlays(page);
  await expect(page).not.toHaveURL(/\/login$/);
  await page.context().storageState({ path: authFile });
});
