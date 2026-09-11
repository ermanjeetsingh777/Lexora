# Locust — Lexora API load testing

Backend/API load tests for **local** and **production**.

**Role:** Locust = *“1000 users ek saath backend ko hit karein to system kaisa perform karega?”*  
(UI/E2E = Playwright under `SLMS_UI/e2e`.)

---

## Hosts

| Env | Host | Config |
|-----|------|--------|
| **Local** | `https://localhost:7050` | `config/local.env`, `local-1000.env` |
| **Production** | `https://apiuniappx.runasp.net` | `config/prod.env`, `prod-1000.env` |

API prefix: `/api/v1`

---

## Setup

```powershell
cd D:\New_Workspace\Lexora\load-tests\locust
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 1000 concurrent users (main scenario)

Staged ramp (safer than dumping 1000 instantly):

| Time | Concurrent users |
|------|------------------|
| 0–60s | 100 |
| 60–120s | 500 |
| 120–180s | **1000** |
| 180–420s | **hold 1000** (~4 min steady) |
| 420–480s | ramp down |

**Shared login ON** — one JWT for all virtual users (avoids 1000× login storm; load focuses on APIs).

### Local 1000

```powershell
# Start API first (dotnet run / VS)
.\run-local-1000.ps1
# → reports\local-1000-report.html

.\run-local-1000-ui.ps1
# → http://localhost:8089
```

### Production 1000

```powershell
# Creates config\prod-1000.env first time — set LOCUST_EMAIL + LOCUST_PASSWORD
.\run-prod-1000.ps1
# Type YES → reports\prod-1000-report.html
```

Use off-peak / capacity approval for prod.

### Flat 1000 (no staged shape)

```powershell
$env:LOCUST_SHAPE = ""
python -m locust -f locustfile.py --host https://localhost:7050 --headless -u 1000 -r 50 -t 5m
```

---

## Smaller smoke runs

```powershell
.\run-local.ps1              # Web UI
.\run-local-headless.ps1     # ~20 users
.\run-prod.ps1
.\run-prod-headless.ps1      # ~10 users (set prod.env)
```

---

## What is hit

Coverage is **read-heavy** (safe for load). Mutating writes (payment initiate, check-in, subscribe, ticket create, etc.) are excluded on purpose.

### Public (`PublicApiUser`)
| Endpoint | Notes |
|----------|-------|
| `GET /packages` | Catalog |
| `GET /addons` | Catalog |
| `GET /customer-reviews/public` | Landing reviews |
| `POST /auth/login` | Light probe only |

### Authenticated (`AuthenticatedApiUser`)

Bootstrap (once, shared across VUs) resolves: institution, branch, library, member, package, addon, subscription, plan, book, seat, support ticket/article, payment transaction ids.

| Module | Endpoints (representative) |
|--------|----------------------------|
| **Auth** | `current-user`, `profile`, `organization-entitlements`, `registration-status` |
| **Dashboard** | `overview`, `revenue`, `activity` |
| **Institutions** | list / dropdown / my-institution / `{id}` + overview, billing, analytics, views |
| **Branches** | `branches/list`, `{id}`, nested institution branches + analytics |
| **Libraries** | list / revenue / `{id}` / calendar / attendance-qr / nested libraries |
| **Plans** | nested library plans + `{planId}` |
| **Members** | list / summary / me / `{id}` + loans, digital-books, photo, aadhaar; scoped institution/branch/library members + bulk template |
| **Attendance** | summary, records, live, analytics, calendar; member calendar/records/stats; library seats |
| **Scanner** | context, members, seats; member status/qr; library qr |
| **Seats** | nested branch seats + `{seatId}` |
| **Books** | nested library books + stats + `{bookId}` |
| **Payments (M-20)** | `platform/status`, list (+ filters), institution account, `{transactionId}` |
| **Subscriptions** | `package-subscriptions/overview`, quote (with ids), requests (admin), institution subscriptions |
| **Packages / Addons** | packages / `{id}` / all; my-addons / `{id}` / all / requests |
| **Notifications** | list |
| **Support** | context, tickets, articles, status + detail by id |
| **Admin** | users, scope-options, roles, permissions, system-health, audit-logs, registrations |
| **Reviews** | admin `customer-reviews` list |

SuperAdmin-only GETs may return **403** for org-admin demo users — that is expected; Locust still records latency.

### Intentionally not hit (writes / heavy)
Payment initiate / verify / webhook / approve · attendance check-in/out / kiosk record · package subscribe/renew/upgrade · addon purchase · support ticket create · review submit · PDF downloads · admin mutations.

---

## Tags

```powershell
python -m locust -f locustfile.py --host https://localhost:7050 --tags dashboard members payments
python -m locust -f locustfile.py --host https://localhost:7050 --exclude-tags admin
```

Useful tags: `public`, `auth`, `dashboard`, `institutions`, `branches`, `libraries`, `plans`, `members`, `attendance`, `scanner`, `seats`, `books`, `payments`, `subscriptions`, `packages`, `addons`, `notifications`, `support`, `admin`, `reviews`.

---

## Folder layout

```
load-tests/locust/
  locustfile.py
  common.py              # Shared JWT + ID bootstrap for 1000 VUs
  shapes.py              # ThousandUsersShape
  config/
    local.env
    local-1000.env
    prod.env.example
    prod-1000.env.example
  run-local-1000.ps1     # ★ local 1000 headless
  run-local-1000-ui.ps1
  run-prod-1000.ps1      # ★ prod 1000 (YES confirm)
  run-local.ps1 / run-prod.ps1
  reports/
```

---

## Tips

1. Local SSL: `LOCUST_VERIFY_SSL=false`
2. Never commit `prod.env` / `prod-1000.env`
3. Watch machine CPU/RAM — Locust client also needs capacity for 1000 VUs
4. Reports: `reports/local-1000-report.html`, `reports/prod-1000-report.html`
5. Demo login defaults: `institution@slms.com` / `Demo@12345` (local)
