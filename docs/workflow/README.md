# SLMS Workflow Documentation

Implementation workflows for **SLMS_UI** (Angular) and **SLMS_API** (.NET). Each doc covers routing, API contracts, user journeys, file maps, and test checklists.

**Module index (with status):** [../modules/README.md](../modules/README.md)

## Core platform

| Doc | Module | Summary |
|-----|--------|---------|
| [auth-workflow.md](./auth-workflow.md) | M-01 Authentication | Login, register, OTP, password reset, JWT |
| [onboarding-workflow.md](./onboarding-workflow.md) | M-03 Onboarding | Institution → branch → library wizard |
| [dashboard-workflow.md](./dashboard-workflow.md) | M-07 Dashboard | Dashboard shell (sub-tabs planned) |

## Organization hierarchy

| Doc | Module | Summary |
|-----|--------|---------|
| [institutions-list-workflow.md](./institutions-list-workflow.md) | M-04 Institutions | Global `/institutions` list and KPIs |
| [institution-detail-workflow.md](./institution-detail-workflow.md) | M-04 Institutions | Detail tabs (overview, branches, libraries, billing, settings, members) |
| [branches-workflow.md](./branches-workflow.md) | M-05 Branches | Global list + branch detail |
| [libraries-list-workflow.md](./libraries-list-workflow.md) | M-08 Libraries | Global `/libraries` list and KPIs |
| [library-detail-workflow.md](./library-detail-workflow.md) | M-08 Libraries | Detail tabs (layout, hours, plans, members, QR) |

## Members

| Doc | Module | Summary |
|-----|--------|---------|
| [members-list-workflow.md](./members-list-workflow.md) | M-06 Members | Global `/members` list |
| [members-detail-workflow.md](./members-detail-workflow.md) | M-06 Members | Profile, attendance, books, QR |
| [scoped-members-workflow.md](./scoped-members-workflow.md) | M-06b Scoped members | Members tabs on detail pages, nested create/detail URLs |

## Operations

| Doc | Module | Summary |
|-----|--------|---------|
| [attendance-module-workflow.md](./attendance-module-workflow.md) | M-13 Attendance | Overview, calendar, live, records, export |
| [attendance-kiosk-workflow.md](./attendance-kiosk-workflow.md) | M-13b Attendance QR | Library/member kiosk, staff scanner, device binding |
| [books-workflow.md](./books-workflow.md) | M-12 Books | Catalog, loans, member digital books |

## Admin & support

| Doc | Module | Summary |
|-----|--------|---------|
| [administration-workflow.md](./administration-workflow.md) | M-15 Admin | Roles, permissions seeding |
| [users-admin-workflow.md](./users-admin-workflow.md) | M-15 Users | User directory and role assignment |
| [support-workflow.md](./support-workflow.md) | M-09 Support | Tickets, knowledge base, system status |

## Requirements (source)

| Doc | Purpose |
|-----|---------|
| [../requirements/01_REQUIREMENT_DOCUMENT.md](../requirements/01_REQUIREMENT_DOCUMENT.md) | High-level requirements |
| [../requirements/02_BUSINESS_REQUIREMENTS_DOCUMENT.md](../requirements/02_BUSINESS_REQUIREMENTS_DOCUMENT.md) | Business rules |
| [../requirements/03_SOFTWARE_REQUIREMENTS_SPECIFICATION.md](../requirements/03_SOFTWARE_REQUIREMENTS_SPECIFICATION.md) | API specification |
