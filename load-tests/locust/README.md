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

### Public (`PublicApiUser`)
`GET /packages`, `/addons`, `/customer-reviews/public`, `POST /auth/login` probe

### Authenticated (`AuthenticatedApiUser`)
Auth, Dashboard, Institutions, Branches, Libraries, Plans, Members, Attendance (+ scanner), Seats, Books, Subscriptions, Packages/Addons, Notifications, Support, Admin, Reviews — mostly **GET** reads. Nested routes use bootstrap IDs.

---

## Tags

```powershell
python -m locust -f locustfile.py --host https://localhost:7050 --tags dashboard members
python -m locust -f locustfile.py --host https://localhost:7050 --exclude-tags admin
```

---

## Folder layout

```
load-tests/locust/
  locustfile.py
  common.py              # Shared JWT for 1000 VUs
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
