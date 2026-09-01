/**
 * Records a mobile Lexora walkthrough for LinkedIn (~6s per module, scroll to bottom).
 * Prerequisite: Live site at https://uniappx.in (or set LEXORA_BASE_URL)
 *
 * Usage (from SLMS_UI):
 *   npx playwright install chromium
 *   set LEXORA_EMAIL=you@example.com
 *   set LEXORA_PASSWORD=your-password
 *   node scripts/record-linkedin-walkthrough.mjs
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.LEXORA_BASE_URL ?? 'https://uniappx.in';
const API_URL = process.env.LEXORA_API_URL ?? 'https://apiuniappx.runasp.net/api/v1';
const LOGIN_EMAIL = process.env.LEXORA_EMAIL ?? 'superadmin@slms.com';
const LOGIN_PASSWORD = process.env.LEXORA_PASSWORD ?? 'SuperAdmin@123';
const OUTPUT_DIR = path.resolve(__dirname, '../../docs/marketing/videos');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'lexora-linkedin-walkthrough-mobile.webm');

/** Per-module hold times (5–7s each). */
const MODULE_HOLDS_MS = [6000, 5500, 6500, 6000, 5000, 7000, 6000, 5500, 6500];

const MOBILE_DEVICE = devices['iPhone 14 Pro Max'];
const VIEWPORT = MOBILE_DEVICE.viewport;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissPolicyBanner(page) {
  const accept = page.getByRole('button', { name: /Accept & Continue/i });
  if (await accept.isVisible({ timeout: 1500 }).catch(() => false)) {
    await accept.click();
    await pause(300);
  }
}

async function tryClick(page, locator, timeout = 2000) {
  try {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator.first();
    if (await el.isVisible({ timeout })) {
      await el.click();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Smooth scroll from current position to page bottom. */
async function scrollToBottom(page, durationMs = 2800) {
  await page.evaluate(async (duration) => {
    const startY = window.scrollY;
    const maxY = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0,
    ) - window.innerHeight;
    const distance = Math.max(0, maxY - startY);
    if (distance <= 0) {
      return;
    }

    const startedAt = performance.now();
    await new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        window.scrollTo(0, startY + distance * progress);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

/** Keep each module on screen for its hold time; scroll to bottom when possible. */
async function holdModule(page, url, holdMs, action, { scroll = true } = {}) {
  const start = Date.now();
  if (url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }
  if (action) {
    await action(page);
  }

  const elapsed = Date.now() - start;
  const scrollBudget = holdMs - elapsed - 400;
  if (scroll && scrollBudget > 500) {
    await scrollToBottom(page, Math.min(scrollBudget, 3200));
  }

  const remaining = holdMs - (Date.now() - start);
  if (remaining > 0) {
    await pause(remaining);
  }
}

/** Verify credentials against the same live API the Angular app uses. */
async function verifyApiLogin(email, password) {
  const loginUrl = `${API_URL}/auth/login`;
  console.log(`Checking login API: POST ${loginUrl}`);

  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    throw new Error(
      `Login API failed (${response.status}): ${body.message ?? 'Unknown error'}\n` +
        `API: ${loginUrl}\n` +
        `Email: ${email}`,
    );
  }

  console.log(`Login API OK for ${email}`);
  return body;
}

/** Type into Angular ngModel fields (page.fill alone does not always update the model). */
async function typeIntoInput(page, selector, value, delay = 12) {
  const input = page.locator(selector);
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay });
}

async function loginOnPage(page, email, password, holdMs) {
  const start = Date.now();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  await typeIntoInput(page, '#email', email);
  await typeIntoInput(page, '#password', password);

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/login') && response.request().method() === 'POST',
    { timeout: 30000 },
  );

  await page.getByRole('button', { name: /^Sign in$/i }).click();

  const response = await loginResponsePromise;
  const body = await response.json().catch(() => ({}));

  console.log(`Browser login API: ${response.url()} → ${response.status()} ${body.message ?? ''}`);

  if (!response.ok() || !body.success) {
    throw new Error(`Browser login failed: ${body.message ?? response.statusText()}`);
  }

  await page.waitForURL(/dashboard|onboarding|pending-approval/, { timeout: 30000 });

  const remaining = holdMs - (Date.now() - start);
  if (remaining > 0) {
    await pause(remaining);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const totalTargetSec = Math.round(MODULE_HOLDS_MS.reduce((a, b) => a + b, 0) / 1000);

  console.log(`Site: ${BASE_URL}`);
  console.log(`API : ${API_URL}`);
  console.log(`User: ${LOGIN_EMAIL}`);
  console.log(
    `Mobile: ${VIEWPORT.width}x${VIEWPORT.height} · holds ${MODULE_HOLDS_MS.map((ms) => `${ms / 1000}s`).join(', ')}`,
  );

  await verifyApiLogin(LOGIN_EMAIL, LOGIN_PASSWORD);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    ...MOBILE_DEVICE,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: VIEWPORT.width, height: VIEWPORT.height },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  console.log(`Recording mobile walkthrough from ${BASE_URL} ...`);

  // Scene 1: Landing
  await holdModule(page, BASE_URL, MODULE_HOLDS_MS[0], async (p) => {
    await dismissPolicyBanner(p);
  });

  // Scene 2: Login (no scroll — form page)
  await loginOnPage(page, LOGIN_EMAIL, LOGIN_PASSWORD, MODULE_HOLDS_MS[1]);

  // Scene 3: Dashboard
  const dashboardUrl = page.url().includes('/dashboard') ? null : `${BASE_URL}/dashboard`;
  await holdModule(page, dashboardUrl, MODULE_HOLDS_MS[2]);

  // Scene 4: Libraries + seat layout
  await holdModule(page, `${BASE_URL}/libraries`, MODULE_HOLDS_MS[3], async (p) => {
    await tryClick(p, 'a[href*="/libraries/"]');
    await pause(350);
    await tryClick(p, p.getByRole('button', { name: /Full preview|Seat preview|preview/i }));
  });

  // Scene 5: QR Attendance scanner
  await holdModule(page, `${BASE_URL}/attendance/scanner`, MODULE_HOLDS_MS[4]);

  // Scene 6: Members
  await holdModule(page, `${BASE_URL}/members`, MODULE_HOLDS_MS[5]);

  // Scene 7: Subscriptions
  await holdModule(page, `${BASE_URL}/subscriptions`, MODULE_HOLDS_MS[6]);

  // Scene 8: Institutions
  await holdModule(page, `${BASE_URL}/institutions`, MODULE_HOLDS_MS[7]);

  // Scene 9: Landing CTA — scroll to bottom then back to top
  await holdModule(page, BASE_URL, MODULE_HOLDS_MS[8], async (p) => {
    await scrollToBottom(p, 2200);
    await pause(200);
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  });

  const video = page.video();
  if (!video) {
    await context.close();
    await browser.close();
    console.error('No video recorded.');
    process.exit(1);
  }

  await Promise.all([video.saveAs(OUTPUT_FILE), context.close()]);
  await browser.close();
  console.log(`\n✅ Video saved: ${OUTPUT_FILE}`);
  console.log(`   Target length: ~${totalTargetSec}s (9 modules, 5–7s each, mobile scroll)`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
