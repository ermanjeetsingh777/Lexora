# SLMS UI

Angular 21 web application for Lexora (Smart Library Management System).

## Development server

```bash
npm install
ng serve
```

Open `http://localhost:4200/`. The app reloads on file changes.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Angular 21 (standalone components, signals) |
| Styling | Tailwind CSS |
| Components | PrimeNG, Lucide icons |
| Tests | Vitest (`ng test`) |

## Project layout

```
SLMS_UI/src/app/
├── core/           # Services, guards, models, constants
├── features/       # Feature modules (members, libraries, attendance, …)
├── layouts/        # App shell, auth layout, sidebar
└── shared/         # Reusable UI components
```

## Feature modules

| Folder | Route | Workflow doc |
|--------|-------|--------------|
| `auth/` | `/login`, `/register`, … | [auth-workflow.md](../docs/workflow/auth-workflow.md) |
| `onboarding/` | `/onboarding/*` | [onboarding-workflow.md](../docs/workflow/onboarding-workflow.md) |
| `dashboard/` | `/dashboard` | [dashboard-workflow.md](../docs/workflow/dashboard-workflow.md) — Overview + Activity |
| `institutions/` | `/institutions` | [institutions-list-workflow.md](../docs/workflow/institutions-list-workflow.md) |
| `branches/` | `/branches` | [branches-workflow.md](../docs/workflow/branches-workflow.md) |
| `libraries/` | `/libraries` | [libraries-list-workflow.md](../docs/workflow/libraries-list-workflow.md) |
| `members/` | `/members`, `/members/bulk-upload` | [members-list-workflow.md](../docs/workflow/members-list-workflow.md), [members-bulk-upload-workflow.md](../docs/workflow/members-bulk-upload-workflow.md) |
| `attendance/` | `/attendance`, `/kiosk/attendance/*` | [attendance-module-workflow.md](../docs/workflow/attendance-module-workflow.md) |
| `books/` | `/books` | [books-workflow.md](../docs/workflow/books-workflow.md) |
| `subscriptions/` | `/subscriptions` | [subscriptions-workflow.md](../docs/workflow/subscriptions-workflow.md) |
| `profile/` | `/profile` | [profile-workflow.md](../docs/workflow/profile-workflow.md) |
| `admin/` | `/users`, `/roles` | [users-admin-workflow.md](../docs/workflow/users-admin-workflow.md) |
| `admin/tenant-approvals/` | `/admin/tenant-approvals` | [tenant-approvals-workflow.md](../docs/workflow/tenant-approvals-workflow.md) |
| `members/` (portal) | `/members/:memberId` | [member-portal-workflow.md](../docs/workflow/member-portal-workflow.md) |
| `core/guards` & `services/` | Global permissions & entitlements | [package-entitlements-workflow.md](../docs/workflow/package-entitlements-workflow.md) |
| `support/` | `/support` | [support-workflow.md](../docs/workflow/support-workflow.md) |

Full module index: [docs/modules/README.md](../docs/modules/README.md)

## Code conventions

See [AGENTS.md](./AGENTS.md) for Angular/TypeScript standards (signals, standalone components, accessibility).

## Build & test

```bash
# Development
npm start                # Local dev server (environment.local.ts)
npm run start:dev        # Dev remote server
npm run start:qa         # QA server
npm run start:uat        # UAT server
npm run start:prod       # Production server

# Production Builds
npm run build:prod       # Production build with Service Worker → dist/slms-ui/browser
npm run build:uat        # UAT build
npm run build:qa         # QA build
npm run build:dev        # Dev build
npm run build:local      # Local build

# Testing
ng test                  # Unit tests (Vitest)
```

## Progressive Web App (PWA) & Branding

- Service Worker precaching and install prompt banner (`PwaService`, `PwaInstallBannerComponent`).
- Scalable vector assets and multi-resolution favicons (`/assets/logo/`, `public/favicon.ico`).
- Generated asset script: `node scripts/generate-icons.js`.

## Documentation

- Monorepo README: [../README.md](../README.md)
- API README: [../SLMS_API/README.md](../SLMS_API/README.md)
- All workflows: [../docs/workflow/README.md](../docs/workflow/README.md)
