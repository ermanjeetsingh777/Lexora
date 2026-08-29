# SLMS_API

.NET REST API for the Smart Library Management System (Lexora).

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | .NET 10 |
| ORM | Entity Framework Core |
| Database | SQL Server |
| Auth | JWT + refresh tokens |
| Excel (bulk members) | ClosedXML |

## Quick start

```bash
cd SLMS_API
dotnet ef database update
dotnet run
```

Default URL: `http://localhost:5050`  
Swagger: `http://localhost:5050/swagger` (Development)

## Project layout

```
SLMS_API/
├── Controllers/           # HTTP endpoints (api/v1/*)
├── Application/
│   ├── Services/          # Business logic
│   ├── Contracts/         # DTOs (requests/responses)
│   ├── Validation/        # FluentValidation
│   └── Helpers/
├── Domain/                # Entities, enums
├── Infrastructure/
│   ├── Data/              # DbContext, migrations
│   └── Repositories/
└── Common/
```

## Controllers (modules)

| Controller | Route prefix | Module doc |
|------------|--------------|------------|
| `AuthController` | `api/v1/auth` | [auth-workflow.md](../docs/workflow/auth-workflow.md) |
| `InstitutionsController` | `api/v1/institutions` | [institutions-list-workflow.md](../docs/workflow/institutions-list-workflow.md) |
| `BranchesController` | `api/v1/institutions/{id}/branches` | [branches-workflow.md](../docs/workflow/branches-workflow.md) |
| `BranchListController` | `api/v1/branches` | [branches-workflow.md](../docs/workflow/branches-workflow.md) |
| `LibrariesController` | `api/v1/institutions/.../libraries` | [library-detail-workflow.md](../docs/workflow/library-detail-workflow.md) |
| `LibraryListController` | `api/v1/libraries` | [libraries-list-workflow.md](../docs/workflow/libraries-list-workflow.md) |
| `AllMembersController` | `api/v1/members` | [members-list-workflow.md](../docs/workflow/members-list-workflow.md), [member-portal-workflow.md](../docs/workflow/member-portal-workflow.md) |
| `MembersController` | `api/v1/institutions/.../members` | [scoped-members-workflow.md](../docs/workflow/scoped-members-workflow.md), [members-bulk-upload-workflow.md](../docs/workflow/members-bulk-upload-workflow.md) |
| `BooksController` | `api/v1/institutions/.../books` | [books-workflow.md](../docs/workflow/books-workflow.md) |
| `AttendanceController` | `api/v1/attendance` | [attendance-module-workflow.md](../docs/workflow/attendance-module-workflow.md), [member-portal-workflow.md](../docs/workflow/member-portal-workflow.md) |
| `AttendanceKioskController` | `api/v1/attendance/kiosk` | [attendance-kiosk-workflow.md](../docs/workflow/attendance-kiosk-workflow.md) |
| `AttendanceScannerController` | `api/v1/attendance/scanner` | [attendance-kiosk-workflow.md](../docs/workflow/attendance-kiosk-workflow.md), [member-portal-workflow.md](../docs/workflow/member-portal-workflow.md) |
| `AdminController` | `api/v1/admin` | [administration-workflow.md](../docs/workflow/administration-workflow.md) |
| `SupportController` | `api/v1/support` | [support-workflow.md](../docs/workflow/support-workflow.md) |
| `DashboardController` | `api/v1/dashboard` | [dashboard-workflow.md](../docs/workflow/dashboard-workflow.md) |
| `PackageSubscriptionsController` | `api/v1/package-subscriptions` | [package-entitlements-workflow.md](../docs/workflow/package-entitlements-workflow.md) (SaaS package billing & creation entitlements) |
| `PlanController` | `api/v1/institutions/.../plans` | [library-detail-workflow.md](../docs/workflow/library-detail-workflow.md) |
| `SubscriptionsController` | `api/v1/institutions/{id}/subscriptions` | Planned |
| `SeatsController` | `api/v1/institutions/.../seats` | Planned |
| `NotificationsController` | `api/v1/notifications` | Planned |

## Documentation

- Module index: [docs/modules/README.md](../docs/modules/README.md)
- Workflow docs: [docs/workflow/README.md](../docs/workflow/README.md)
- Requirements: [docs/requirements/](../docs/requirements/)

## Configuration & Environments

- `appsettings.json` — Base fallback configuration (connection strings, JWT defaults, Identity seed credentials)
- `appsettings.Local.json` — Local developer workstation configuration (`ASPNETCORE_ENVIRONMENT=Local`)
- `appsettings.Development.json` — ASP.NET Core default Development configuration (`ASPNETCORE_ENVIRONMENT=Development`)
- `appsettings.Dev.json` — Dev remote deployment environment (`ASPNETCORE_ENVIRONMENT=Dev`)
- `appsettings.QA.json` — QA / Testing deployment environment (`ASPNETCORE_ENVIRONMENT=QA`)
- `appsettings.UAT.json` — UAT / Pre-production staging environment (`ASPNETCORE_ENVIRONMENT=UAT`)
- `appsettings.Production.json` — Production deployment environment (`ASPNETCORE_ENVIRONMENT=Production`)

### Running API in a specific environment

```bash
# Run with Local environment
dotnet run --project SLMS_API --launch-profile "Local (HTTPS)"

# Run with Dev environment
dotnet run --project SLMS_API --launch-profile "Dev"

# Run with QA environment
dotnet run --project SLMS_API --launch-profile "QA"

# Run with UAT environment
dotnet run --project SLMS_API --launch-profile "UAT"

# Run with Production environment
dotnet run --project SLMS_API --launch-profile "Production"
```

### Seed data (startup)

| Seed | When | Purpose |
|------|------|---------|
| Roles + permissions | Always | `DbSeeder.SeedRolesAsync` / `SeedRolePermissionsAsync` |
| SuperAdmin user | Always | `SuperAdminSeedData` — `superadmin@slms.com` by default |
| Demo institute | `Demo:Enabled` | Org admin, branches, libraries, sample members |

**Seed SuperAdmin only:**

```bash
dotnet run --project SLMS_API -- --seed-superadmin
```

Migrations: `SLMS_API/Infrastructure/Data/Migrations/`

Build output folder `SLMS_API/_build_check/` is gitignored (alternate build path when default output is locked).

```bash
dotnet ef migrations add <Name> --project SLMS_API
dotnet ef database update --project SLMS_API
```
