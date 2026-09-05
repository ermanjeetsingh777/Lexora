# Lexora Playwright E2E + MCP

Full-application browser tests for **SLMS_UI** — public pages, all authenticated modules, and **entity detail flows** (Institution / Branch / Library / Member).

---

## Prerequisites

1. **API** running (local `https://localhost:7050` or your env).
2. **Demo login** available:
   - Email: `institution@slms.com`
   - Password: `Demo@12345`  
   Override: `E2E_EMAIL` / `E2E_PASSWORD`.
3. Chromium installed once:

```powershell
cd SLMS_UI
npx playwright install chromium
```

4. Prefer `ng serve` already running on `http://localhost:4200` (or let Playwright start it).

---

## Commands (cheat sheet)

| Command | Kya chalta hai |
|---------|----------------|
| `npm run e2e` | Saare projects (auth-setup + chromium + public) |
| `npm run e2e:ui` | **Saare features (UI)** — chromium + public |
| `npm run e2e:features` | Sirf **authenticated modules** (chromium) |
| `npm run e2e:public` | Sirf **public** pages |
| `npm run e2e:ui:all` | Teeno projects UI (auth-setup + chromium + public) |
| `npm run e2e:details` | Sirf Institution / Branch / Library / Member **details** |
| `npm run e2e:ui:details` | Wahi details suite **UI** mode mein |
| `npm run e2e:headed` | Headed browser (chromium + public) |
| `npm run e2e:report` | Last HTML report open |
| `npm run e2e:mcp` | `@playwright/mcp@latest` standalone |

```powershell
cd D:\New_Workspace\Lexora\SLMS_UI

npm run e2e:ui
npm run e2e:features
npm run e2e:public
npm run e2e:ui:all
npm run e2e:ui:details
npm run e2e:details
npm run e2e:report
```

### Agar `ng serve` pehle se chal raha hai

```powershell
$env:E2E_SKIP_WEBSERVER="1"
npm run e2e:ui
```

### Live site (`uniappx.in`)

```powershell
$env:E2E_BASE_URL="https://uniappx.in"
$env:E2E_EMAIL="you@example.com"
$env:E2E_PASSWORD="your-password"
$env:E2E_SKIP_WEBSERVER="1"
npm run e2e:features
```

---

## Playwright projects

| Project | Purpose |
|---------|---------|
| `auth-setup` | Login once → saves `e2e/.auth/user.json` |
| `chromium` | Authenticated feature + detail tests (uses saved auth) |
| `public` | Landing, policies, login/register, kiosk (no auth storage) |

### UI mode tip

Agar sidebar mein sirf `auth-setup` dikhe:

1. **Projects** filter → `chromium` + `public` select karo (ya `npm run e2e:ui` use karo).
2. Details ke liye: `npm run e2e:ui:details` → expand:
   - `Institution details`
   - `Branch details`
   - `Library details`
   - `Member details`

---

## What is covered

### A) Feature smoke (list / create / sidebar)

Catalog: `e2e/fixtures/routes.ts` → `authenticatedFeatureModules`  
Specs: `e2e/modules/all-modules.spec.ts` (+ dashboard, members, attendance, …)

| Feature | Routes / components |
|---------|---------------------|
| Dashboard | overview, analytics, occupancy, revenue, attendance, subscriptions, notifications, activity |
| Members | list, create, bulk-upload |
| Attendance | overview, calendar, live, records, scanner |
| Institutions | list, create |
| Branches | list, create |
| Libraries | list, create |
| Subscriptions | package subscriptions |
| Books | catalogue (+ add dialog when available) |
| Admin | users, roles, approvals |
| Profile | profile / settings redirect |
| Support | centre, status (+ ticket dialog when available) |
| Sidebar | every primary sidebar link |

Public: landing, features, prices, policies, auth pages, kiosk — `e2e/public/public-pages.spec.ts`

### B) Entity details (card → tabs → nested routes)

Spec: **`e2e/modules/entity-details.spec.ts`**  
Helpers: **`e2e/fixtures/detail-nav.ts`**

| Suite | Flow |
|-------|------|
| **Institution details** | List card → detail → tabs (Overview, Branches, Libraries, Members, Billing, Settings) → `addbranch` / `addlibrary` / `members/create` → first branch/library from tabs |
| **Branch details** | List card → tabs (Overview, Usage, Libraries, Members, Staffing, Activity) → `edit` / `addlibrary` / `members/create` → library / member from tabs |
| **Library details** | List card → tabs (Overview, Seats, Members, Plans, Profile, Hours, Exceptions, Calendar, Sections) → `edit` / `members/create` → seat preview → member |
| **Member details** | List row → tabs (Overview, Attendance, Library Calendar, Books, E-Books, Payments & Plans, Contacts, Change Password) → `/edit` form |

Agar list empty ho (no seed data), related tests **skip** ho sakte hain — API + demo data chahiye.

---

## Auth

- Setup: `e2e/auth.setup.ts`
- Storage: `e2e/.auth/user.json` (gitignored)
- Login helper: `e2e/fixtures/helpers.ts` → `loginViaUi`

---

## Playwright MCP (`@playwright/mcp@latest`)

Configured in repo root [`.mcp.json`](../.mcp.json) as server **`playwright`**.

1. Cursor mein MCP reload / restart.
2. Agent se: *“Open http://localhost:4200 and test login + dashboard + members”*.
3. Tools: `browser_navigate`, `browser_snapshot`, `browser_click`, …

```powershell
npm run e2e:mcp
```

---

## Folder layout

```
SLMS_UI/
  playwright.config.ts
  e2e/
    README.md                 ← this file
    auth.setup.ts
    .auth/                    ← login storage (local only)
    fixtures/
      helpers.ts              ← overlays, login, page health
      routes.ts               ← feature route catalog
      detail-nav.ts           ← open card, tabs, nested routes
    public/
      public-pages.spec.ts
    modules/
      all-modules.spec.ts     ← feature-wise smoke
      entity-details.spec.ts  ← institution/branch/library/member details
      auth.spec.ts
      dashboard.spec.ts
      members.spec.ts
      organization.spec.ts
      attendance.spec.ts
      admin-support.spec.ts
```

---

## Adding new tests (future)

1. **New static route** → add to `e2e/fixtures/routes.ts` under the right `FeatureModule`.
2. **New detail tabs** → update tab lists in `e2e/fixtures/detail-nav.ts` + cases in `entity-details.spec.ts`.
3. **New nested path** (e.g. `/libraries/:id/foo`) → `visitNestedRoutes(...)` in the matching describe.
4. Keep UI project filter on **`chromium`** for authenticated tests.

---

## Timeouts (API slow / data late)

Playwright waits for **API + UI** before asserting (`waitForApiAndUi` in `helpers.ts`):

| Setting | Value |
|---------|--------|
| Test timeout | 180s (entity details: 240s) |
| Expect | 45s |
| Action | 30s |
| Navigation | 60s |
| API / networkidle + loader | 60s |
| Login | 90s |
| List cards appear | up to 60s poll |

Har navigation ke baad: `networkidle` → globalLoader gone → short settle → phir assert.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| UI shows only `auth-setup` | Use `npm run e2e:ui` or select Projects → `chromium` + `public` |
| Only Branch details visible | Expand other suites or run `npm run e2e:ui:details` then **Run all** |
| Login fails | Check API + `E2E_EMAIL` / `E2E_PASSWORD`; demo seed enabled |
| Connection refused `:4200` | Start `ng serve` or remove `E2E_SKIP_WEBSERVER` |
| Entity tests skipped | No cards in list — seed demo institution/branch/library/members |
