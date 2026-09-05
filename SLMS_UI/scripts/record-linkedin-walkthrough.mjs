/**
 * Mobile LinkedIn product walkthrough — all feature routes, scroll to buttons, ~5–7s/module.
 * Landing: 15s. PWA + policy banners auto-dismissed.
 *
 * Usage (from SLMS_UI):
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

const MOBILE_DEVICE = devices['iPhone 14 Pro Max'];
const VIEWPORT = MOBILE_DEVICE.viewport;
const DEFAULT_HOLD_MS = 6000;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** All scenes: landing 15s, others 5–7s. Scroll through page + key buttons before next route. */
const SCENES = [
  {
    name: 'Landing',
    url: BASE_URL,
    holdMs: 15000,
    continuousScroll: true,
    scrollTargets: [
      'a[href="/register"]',
      'a[href="/login"]',
      '#features',
      '#dashboard',
      '#workflow',
      '#reviews',
      '#pricing',
    ],
  },
  {
    name: 'Features',
    url: `${BASE_URL}/features`,
    holdMs: 6000,
    scrollTargets: ['h1', 'section', 'a[href="/register"]', 'a[href="/login"]'],
  },
  {
    name: 'Pricing',
    url: `${BASE_URL}/prices`,
    holdMs: 6500,
    scrollTargets: ['h1', 'article', 'a[href*="/register"]', 'table'],
  },
  {
    name: 'Login',
    url: `${BASE_URL}/login`,
    holdMs: 6000,
    scroll: false,
    login: true,
  },
  { name: 'Dashboard', url: `${BASE_URL}/dashboard`, holdMs: 6000, continuousScroll: true },
  { name: 'Members', url: `${BASE_URL}/members`, holdMs: 6000, continuousScroll: true },
  { name: 'Attendance Overview', url: `${BASE_URL}/attendance`, holdMs: 6000, continuousScroll: true },
  { name: 'Attendance Scanner', url: `${BASE_URL}/attendance/scanner`, holdMs: 5500, continuousScroll: true },
  { name: 'Attendance Records', url: `${BASE_URL}/attendance/records`, holdMs: 6000, continuousScroll: true },
  { name: 'Attendance Calendar', url: `${BASE_URL}/attendance/calendar`, holdMs: 5500, continuousScroll: true },
  { name: 'Institutions', url: `${BASE_URL}/institutions`, holdMs: 6000, continuousScroll: true },
  { name: 'Branches', url: `${BASE_URL}/branches`, holdMs: 6000, continuousScroll: true },
  {
    name: 'Libraries',
    url: `${BASE_URL}/libraries`,
    holdMs: 7000,
    action: async (page) => {
      await tryClick(page, 'a[href*="/libraries/"]');
      await pause(600);
      await tryClick(page, page.getByRole('button', { name: /Full preview|Seat preview|preview/i }));
      await pause(600);
    },
    continuousScroll: true,
  },
  { name: 'Subscriptions', url: `${BASE_URL}/subscriptions`, holdMs: 6000, continuousScroll: true },
  { name: 'Books', url: `${BASE_URL}/books`, holdMs: 6000, continuousScroll: true },
  { name: 'Users', url: `${BASE_URL}/users`, holdMs: 5500, continuousScroll: true },
  { name: 'Roles', url: `${BASE_URL}/roles`, holdMs: 5500, continuousScroll: true },
  { name: 'Admin Approvals', url: `${BASE_URL}/admin/approvals`, holdMs: 6000, continuousScroll: true },
  { name: 'Profile', url: `${BASE_URL}/profile`, holdMs: 5000, continuousScroll: true },
  { name: 'Support', url: `${BASE_URL}/support`, holdMs: 6000, continuousScroll: true },
];

async function waitForLoaderGone(page) {
  await page
    .waitForFunction(
      () => {
        const loader = document.getElementById('globalLoader');
        if (!loader) return true;
        const style = window.getComputedStyle(loader);
        return (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.pointerEvents === 'none' ||
          Number(style.opacity) < 0.05
        );
      },
      { timeout: 12000 },
    )
    .catch(() => {});
  await pause(250);
}

/** Hide/dismiss popups without blocking on loader or intercepted clicks. */
async function dismissOverlays(page) {
  try {
    await waitForLoaderGone(page);

    await page.evaluate(() => {
      localStorage.setItem('lexora_policy_consent_accepted_v1', 'true');

      for (const sel of ['app-pwa-install-banner', 'app-policy-consent-banner']) {
        document.querySelectorAll(sel).forEach((el) => {
          el.style.setProperty('display', 'none', 'important');
        });
      }

      const loader = document.getElementById('globalLoader');
      if (loader) {
        loader.style.setProperty('display', 'none', 'important');
        loader.style.setProperty('pointer-events', 'none', 'important');
      }
    });

    const softClicks = [
      page.getByRole('button', { name: /Accept & Continue/i }),
      page.getByRole('button', { name: /Not now/i }),
      page.locator('app-pwa-install-banner button[aria-label="Close"]'),
    ];

    for (const locator of softClicks) {
      try {
        const el = locator.first();
        if (await el.isVisible({ timeout: 400 }).catch(() => false)) {
          await el.click({ force: true, timeout: 1500 });
        }
      } catch {
        /* non-fatal */
      }
    }
  } catch {
    /* overlays must never stop recording */
  }
}

async function tryClick(page, locator, timeout = 2000) {
  try {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator.first();
    if (await el.isVisible({ timeout })) {
      await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await el.click();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

async function resetScrollTop(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
  await pause(400);
}

async function getMaxScrollY(page) {
  return page.evaluate(() => {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0,
      document.documentElement.offsetHeight,
    );
    return Math.max(0, height - window.innerHeight);
  });
}

/** Eased smooth scroll (ease-in-out cubic) — reads naturally on video. */
async function smoothScrollTo(page, targetY, durationMs) {
  const duration = Math.max(800, Math.round(durationMs));
  const y = Math.max(0, Math.round(targetY));

  await page.evaluate(
    ({ scrollY, duration }) =>
      new Promise((resolve) => {
        const startY = window.scrollY;
        const distance = scrollY - startY;
        if (Math.abs(distance) < 3) {
          resolve();
          return;
        }

        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
        const started = performance.now();

        const frame = (now) => {
          const progress = Math.min((now - started) / duration, 1);
          const nextY = Math.round(startY + distance * ease(progress));
          window.scrollTo(0, nextY);
          document.documentElement.scrollTop = nextY;
          document.body.scrollTop = nextY;
          if (progress < 1) {
            requestAnimationFrame(frame);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(frame);
      }),
    { scrollY: y, duration },
  );

  await pause(duration + 80);
}

async function getScrollTargetY(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return window.scrollY;
    const top = el.getBoundingClientRect().top + window.scrollY - 64;
    const max =
      Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0) -
      window.innerHeight;
    return Math.max(0, Math.min(top, max));
  }, selector);
}

/** Scroll to each target, then finish at page bottom — smooth eased motion. */
async function scrollThroughModule(page, holdMs, scrollTargets = [], { continuous = false } = {}) {
  const start = Date.now();
  await resetScrollTop(page);

  const maxY = await getMaxScrollY(page);

  // Long pages (landing): one slow continuous scroll top → bottom
  if (continuous || scrollTargets.length === 0) {
    const scrollTime = holdMs - 600;
    await smoothScrollTo(page, maxY, scrollTime);
    await pause(600);
    return;
  }

  const holdAfterSection = 900;
  const minScrollMs = 2200;
  const maxScrollMs = 3800;

  for (const selector of scrollTargets) {
    const elapsed = Date.now() - start;
    const remaining = holdMs - elapsed;
    if (remaining < minScrollMs + holdAfterSection) break;

    const targetY = await getScrollTargetY(page, selector);
    const currentY = await page.evaluate(() => window.scrollY);
    if (Math.abs(targetY - currentY) < 24) {
      await pause(holdAfterSection);
      continue;
    }

    const scrollMs = Math.min(maxScrollMs, Math.max(minScrollMs, remaining - holdAfterSection - 400));
    await smoothScrollTo(page, targetY, scrollMs);
    await pause(holdAfterSection);
  }

  const remaining = holdMs - (Date.now() - start);
  if (remaining > 700) {
    const currentY = await page.evaluate(() => window.scrollY);
    if (maxY > currentY + 30) {
      await smoothScrollTo(page, maxY, remaining - 300);
      await pause(300);
    } else {
      await pause(remaining);
    }
  }
}

async function incrementalScrollToBottom(page, durationMs) {
  const maxY = await getMaxScrollY(page);
  const currentY = await page.evaluate(() => window.scrollY);
  if (maxY <= currentY + 10) {
    await pause(durationMs);
    return;
  }
  await smoothScrollTo(page, maxY, durationMs);
}

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
        `API: ${loginUrl}\nEmail: ${email}`,
    );
  }

  console.log(`Login API OK for ${email}`);
  return body;
}

async function typeIntoInput(page, selector, value, delay = 10) {
  const input = page.locator(selector);
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay });
}

async function loginOnPage(page, email, password, holdMs) {
  const start = Date.now();
  await dismissOverlays(page);
  await typeIntoInput(page, '#email', email);
  await typeIntoInput(page, '#password', password);

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/login') && response.request().method() === 'POST',
    { timeout: 30000 },
  );

  await page.getByRole('button', { name: /^Sign in$/i }).click();

  const response = await loginResponsePromise;
  const body = await response.json().catch(() => ({}));
  console.log(`Browser login API: ${response.status()} ${body.message ?? ''}`);

  if (!response.ok() || !body.success) {
    throw new Error(`Browser login failed: ${body.message ?? response.statusText()}`);
  }

  await page.waitForURL(/dashboard|onboarding|pending-approval/, { timeout: 30000 });
  await dismissOverlays(page);

  const remaining = holdMs - (Date.now() - start);
  if (remaining > 0) await pause(remaining);
}

async function recordScene(page, scene) {
  const holdMs = scene.holdMs ?? DEFAULT_HOLD_MS;
  console.log(`  → ${scene.name} (${holdMs / 1000}s)`);

  if (scene.login) {
    await page.goto(scene.url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await loginOnPage(page, LOGIN_EMAIL, LOGIN_PASSWORD, holdMs);
    return;
  }

  await page.goto(scene.url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await dismissOverlays(page);

  if (scene.action) {
    await scene.action(page);
    await dismissOverlays(page);
  }

  if (scene.scroll !== false) {
    await scrollThroughModule(page, holdMs, scene.scrollTargets ?? [], {
      continuous: scene.continuousScroll ?? false,
    });
  } else {
    await pause(holdMs);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const totalSec = Math.round(SCENES.reduce((sum, s) => sum + (s.holdMs ?? DEFAULT_HOLD_MS), 0) / 1000);

  console.log(`Site : ${BASE_URL}`);
  console.log(`API  : ${API_URL}`);
  console.log(`User : ${LOGIN_EMAIL}`);
  console.log(`Mobile: ${VIEWPORT.width}x${VIEWPORT.height} · ~${totalSec}s · ${SCENES.length} scenes`);

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

  await context.addInitScript(() => {
    localStorage.setItem('lexora_policy_consent_accepted_v1', 'true');

    const hidePopups = () => {
      document.querySelectorAll('app-pwa-install-banner, app-policy-consent-banner').forEach((el) => {
        el.style.setProperty('display', 'none', 'important');
      });
    };

    hidePopups();
    new MutationObserver(hidePopups).observe(document.documentElement, { childList: true, subtree: true });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  console.log('Recording mobile walkthrough...\n');

  for (const scene of SCENES) {
    try {
      await recordScene(page, scene);
    } catch (err) {
      console.warn(`  ⚠ ${scene.name} skipped: ${err.message ?? err}`);
    }
  }

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
  console.log(`   Scenes: ${SCENES.length} · target ~${totalSec}s + navigation`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
