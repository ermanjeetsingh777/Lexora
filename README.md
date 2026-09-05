# Lexora

Smart Library Management System (SLMS) — multi-tenant SaaS for institutions, branches, libraries, members, attendance, books, subscriptions, and administration.

## Repositories

| Project | Stack | Description |
|---------|-------|-------------|
| **SLMS_API** | .NET 10, EF Core, SQL Server | REST API — [SLMS_API/README.md](SLMS_API/README.md) |
| **SLMS_UI** | Angular 21, Tailwind, Lucide Icons | Web application — [SLMS_UI/README.md](SLMS_UI/README.md) |

## Quick start

```bash
# API
cd SLMS_API
dotnet ef database update
dotnet run

# UI
cd SLMS_UI
npm install
ng serve
```

- API: `http://localhost:5050` / `https://localhost:7050`
- UI: `http://localhost:4200`

### Development login (seeded)

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | `superadmin@slms.com` | `SuperAdmin@123` |
| Demo org admin | `institution@slms.com` | `Demo@12345` (requires `Demo:Enabled` in API) |

See [auth-workflow.md](docs/workflow/auth-workflow.md) and [administration-workflow.md](docs/workflow/administration-workflow.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/modules/README.md](docs/modules/README.md) | **Module index** — all features by ID with status |
| [docs/workflow/README.md](docs/workflow/README.md) | Implementation workflows (routes, API, file maps) |
| [docs/requirements/](docs/requirements/) | BRD, SRS, requirement documents |
| [SLMS_UI/e2e/README.md](SLMS_UI/e2e/README.md) | **Playwright E2E** — all features + institution/branch/library/member details |
| [load-tests/locust/README.md](load-tests/locust/README.md) | **Locust API load tests** — local + production endpoints |

## Module workflows

| ID | Module | Doc |
|----|--------|-----|
| M-01 | Authentication | [auth-workflow.md](docs/workflow/auth-workflow.md) |
| M-03 | Onboarding | [onboarding-workflow.md](docs/workflow/onboarding-workflow.md) |
| M-04 | Institutions (list) | [institutions-list-workflow.md](docs/workflow/institutions-list-workflow.md) |
| M-04 | Institutions (detail) | [institution-detail-workflow.md](docs/workflow/institution-detail-workflow.md) |
| M-05 | Branches | [branches-workflow.md](docs/workflow/branches-workflow.md) |
| M-06 | Members (list) | [members-list-workflow.md](docs/workflow/members-list-workflow.md) |
| M-06 | Members (bulk upload) | [members-bulk-upload-workflow.md](docs/workflow/members-bulk-upload-workflow.md) |
| M-06 | Members (detail) | [members-detail-workflow.md](docs/workflow/members-detail-workflow.md) |
| M-06b | Scoped members | [scoped-members-workflow.md](docs/workflow/scoped-members-workflow.md) |
| M-07 | Dashboard | [dashboard-workflow.md](docs/workflow/dashboard-workflow.md) |
| M-08 | Libraries (list) | [libraries-list-workflow.md](docs/workflow/libraries-list-workflow.md) |
| M-08 | Libraries (detail) | [library-detail-workflow.md](docs/workflow/library-detail-workflow.md) |
| M-09 | Support | [support-workflow.md](docs/workflow/support-workflow.md) |
| M-10 | SaaS subscriptions & Add-ons | [subscriptions-workflow.md](docs/workflow/subscriptions-workflow.md) |
| M-11 | Profile | [profile-workflow.md](docs/workflow/profile-workflow.md) |
| M-12 | Books & circulation | [books-workflow.md](docs/workflow/books-workflow.md) |
| M-13 | Attendance (staff) | [attendance-module-workflow.md](docs/workflow/attendance-module-workflow.md) |
| M-13b | Attendance QR kiosk | [attendance-kiosk-workflow.md](docs/workflow/attendance-kiosk-workflow.md) |
| M-15 | Administration | [administration-workflow.md](docs/workflow/administration-workflow.md) |
| M-15 | Users & roles | [users-admin-workflow.md](docs/workflow/users-admin-workflow.md) |
| M-16 | Member portal | [member-portal-workflow.md](docs/workflow/member-portal-workflow.md) |
| M-17 | Package entitlements, Add-ons & RBAC | [package-entitlements-workflow.md](docs/workflow/package-entitlements-workflow.md) |
| M-18 | Tenant & Subscription Approvals | [tenant-approvals-workflow.md](docs/workflow/tenant-approvals-workflow.md) |
| M-19 | Customer Reviews & Suggestions | [customer-reviews-workflow.md](docs/workflow/customer-reviews-workflow.md) |

## Attendance QR kiosk (public, no login)

| QR type | Public URL | Purpose |
|---------|------------|---------|
| Library | `/kiosk/attendance/library?token=` | Member list → select → check in/out |
| Member | `/kiosk/attendance/member?token=` | Self check-in/out |

Staff tools: `/attendance/scanner` (requires `attendance.scanner.use` permission).
