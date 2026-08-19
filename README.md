# Lexora

Smart Library Management System (SLMS) — multi-tenant SaaS for institutions, branches, libraries, members, attendance, books, and administration.

## Repositories

| Project | Stack | Description |
|---------|-------|-------------|
| **SLMS_API** | .NET 10, EF Core, SQL Server | REST API |
| **SLMS_UI** | Angular 21, Tailwind, PrimeNG | Web application |

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

- API: `http://localhost:5050`
- UI: `http://localhost:4200`

## Module documentation

Implementation workflows (Angular + API, routes, endpoints, file maps):

| Module | Doc |
|--------|-----|
| Institution detail | [docs/workflow/institution-detail-workflow.md](docs/workflow/institution-detail-workflow.md) |
| **Libraries (list)** | **[docs/workflow/libraries-list-workflow.md](docs/workflow/libraries-list-workflow.md)** |
| M-06 Members (list) | [docs/workflow/members-list-workflow.md](docs/workflow/members-list-workflow.md) |
| M-06 Members (detail) | [docs/workflow/members-detail-workflow.md](docs/workflow/members-detail-workflow.md) |
| M-12 Books & circulation | [docs/workflow/books-workflow.md](docs/workflow/books-workflow.md) |
| **M-13 Attendance QR kiosk** | **[docs/workflow/attendance-kiosk-workflow.md](docs/workflow/attendance-kiosk-workflow.md)** |
| M-15 Administration (overview) | [docs/workflow/administration-workflow.md](docs/workflow/administration-workflow.md) |
| **M-15 Users & roles** | **[docs/workflow/users-admin-workflow.md](docs/workflow/users-admin-workflow.md)** |

Requirements (BRD / SRS): [docs/requirements/](docs/requirements/)

## Attendance QR kiosk (public, no login)

| QR type | Public URL | Purpose |
|---------|------------|---------|
| Library | `/kiosk/attendance/library?token=` | Member list → select → check in/out |
| Member | `/kiosk/attendance/member?token=` | Self check-in/out |

Staff tools: `/attendance/scanner` (requires `attendance.scanner.use` permission).

See [attendance-kiosk-workflow.md](docs/workflow/attendance-kiosk-workflow.md) for full API and file reference.
