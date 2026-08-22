# Lexora (SLMS) — Module Index

Smart Library Management System modules across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

Each module has an implementation workflow under [../workflow/](../workflow/) with routes, API contracts, file maps, and test checklists.

## Module catalog

| ID | Module | Route(s) | Workflow doc | Status |
|----|--------|----------|--------------|--------|
| M-01 | Authentication | `/login`, `/register`, `/forgot-password`, … | [auth-workflow.md](../workflow/auth-workflow.md) | Implemented |
| M-02 | Landing & marketing | `/`, `/features`, `/prices`, `/terms`, `/privacy-policy` | — | Implemented (no workflow yet) |
| M-03 | Onboarding | `/onboarding/*` | [onboarding-workflow.md](../workflow/onboarding-workflow.md) | Implemented |
| M-04 | Institutions | `/institutions`, `/institutions/:id` | [institutions-list-workflow.md](../workflow/institutions-list-workflow.md), [institution-detail-workflow.md](../workflow/institution-detail-workflow.md) | Implemented |
| M-05 | Branches | `/branches`, `/branches/:id` | [branches-workflow.md](../workflow/branches-workflow.md) | Implemented |
| M-06 | Members | `/members`, `/members/:id` | [members-list-workflow.md](../workflow/members-list-workflow.md), [members-detail-workflow.md](../workflow/members-detail-workflow.md) | Implemented |
| M-06b | Scoped members | Nested under institution / branch / library detail | [scoped-members-workflow.md](../workflow/scoped-members-workflow.md) | Implemented |
| M-07 | Dashboard | `/dashboard` | [dashboard-workflow.md](../workflow/dashboard-workflow.md) | Partial (overview shell only) |
| M-08 | Libraries | `/libraries`, `/libraries/:id` | [libraries-list-workflow.md](../workflow/libraries-list-workflow.md), [library-detail-workflow.md](../workflow/library-detail-workflow.md) | Implemented |
| M-09 | Support | `/support`, `/support/status` | [support-workflow.md](../workflow/support-workflow.md) | Implemented |
| M-12 | Books & circulation | `/books` | [books-workflow.md](../workflow/books-workflow.md) | Implemented |
| M-13 | Attendance (staff) | `/attendance/*` | [attendance-module-workflow.md](../workflow/attendance-module-workflow.md) | Implemented |
| M-13b | Attendance QR kiosk | `/kiosk/attendance/*`, `/attendance/scanner` | [attendance-kiosk-workflow.md](../workflow/attendance-kiosk-workflow.md) | Implemented |
| M-15 | Administration | `/users`, `/roles` | [administration-workflow.md](../workflow/administration-workflow.md), [users-admin-workflow.md](../workflow/users-admin-workflow.md) | Implemented |

## Planned / not yet routed

| Area | Notes |
|------|-------|
| Subscriptions | Route commented out in `app.routes.ts` |
| Payments | Route commented out |
| Seats | Route commented out |
| Reports, Notifications, Settings | Sidebar entries exist; routes not wired |
| Dashboard sub-tabs | Analytics, occupancy, revenue, etc. commented out |

## Requirements (source)

| Doc | Purpose |
|-----|---------|
| [01_REQUIREMENT_DOCUMENT.md](../requirements/01_REQUIREMENT_DOCUMENT.md) | High-level requirements |
| [02_BUSINESS_REQUIREMENTS_DOCUMENT.md](../requirements/02_BUSINESS_REQUIREMENTS_DOCUMENT.md) | Business rules |
| [03_SOFTWARE_REQUIREMENTS_SPECIFICATION.md](../requirements/03_SOFTWARE_REQUIREMENTS_SPECIFICATION.md) | API specification |

## Project READMEs

| Project | Doc |
|---------|-----|
| Monorepo | [../../README.md](../../README.md) |
| API | [../../SLMS_API/README.md](../../SLMS_API/README.md) |
| UI | [../../SLMS_UI/README.md](../../SLMS_UI/README.md) |
