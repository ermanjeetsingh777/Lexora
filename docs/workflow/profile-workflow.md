# User Profile — Implementation Workflow

End-to-end workflow for **M-11 Profile** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-11 · **Route:** `/profile` · **Depends on:** M-01 Authentication

---

## 1. Overview

Signed-in users view and manage their account: personal details, password, workspace access (institutions / branches / libraries), roles, and effective permissions. Replaces the former **Settings** sidebar entry.

```mermaid
flowchart LR
  SB[Sidebar / Topbar] --> P[/profile]
  P --> T1[Account tab]
  P --> T2[Security tab]
  P --> T3[Workspace tab]
  P --> T4[Permissions tab]
  P --> API[AuthController profile endpoints]
  API --> PS[ProfileService]
  PS --> AS[AdminService scope]
```

---

## 2. Angular Workflow (SLMS_UI)

### 2.1 Routing

| Route | Component | File |
|-------|-----------|------|
| `/profile` | `ProfileComponent` | `SLMS_UI/src/app/features/profile/` |
| `/settings` | Redirect → `/profile` | `SLMS_UI/src/app/app.routes.ts` |
| `/settings/profile` | Redirect → `/profile` | `SLMS_UI/src/app/app.routes.ts` |

**Navigation**

| Location | Link |
|----------|------|
| Sidebar (Admin section) | **Profile** → `/profile` |
| Topbar user menu | **Profile** → `/profile` |

Guards: `authGuard`, `onboardingCompleteGuard` (app shell).

### 2.2 UI structure

**Hero banner** — avatar initials, name, email, primary role badge, member since.

**Tabs** (pill nav — same pattern as Support / Dashboard):

| Tab | Content |
|-----|---------|
| Account | View personal info; **Edit** toggles form (full name, username, email) |
| Security | Change password; 2FA status (read-only until wired in UI) |
| Workspace | Institution / branch / library counts and mapped names; platform-wide banner for SuperAdmin |
| Permissions | Grouped capabilities by module; optional “Show technical keys” for permission codes |

### 2.3 Key files

| File | Role |
|------|------|
| `profile.component.ts` / `.html` / `.css` | Page shell, tabs, forms |
| `profile.service.ts` | API wrapper |
| `profile.util.ts` | Role labels, module labels, access summary text |
| `core/models/profile.models.ts` | `UserProfile`, `UpdateProfileRequest`, `ChangePasswordRequest` |

---

## 3. .NET Workflow (SLMS_API)

**Controller:** `SLMS_API/Controllers/AuthController.cs`  
**Service:** `SLMS_API/Application/Services/ProfileService.cs`  
**Base route:** `api/v1/auth`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/profile` | Full profile: user, roles, permissions (with names), workspace access scope |
| PATCH | `/profile` | Update `fullName`, `userName`, `email` (unique checks) |
| POST | `/change-password` | Self-service password change (requires current password) |
| GET | `/current-user` | Lightweight user + permission keys (used elsewhere) |

**Response model:** `UserProfileResponse` — includes `AccessScope` (`AdminUserAccessScopeResponse`), `AccessSummary` counts, `PermissionDetails` (code + name).

**Scope resolution:** `IAdminService.GetUserAccessScopeAsync(userId)` — same mapping as admin user directory.

---

## 4. File map

```
SLMS_UI/src/app/features/profile/
├── profile.component.ts
├── profile.component.html
├── profile.component.css
├── profile.service.ts
└── profile.util.ts

SLMS_UI/src/app/core/models/profile.models.ts

SLMS_UI/src/app/layouts/
├── sidebar/sidebar.component.ts      # Profile nav item
└── topbar/topbar.component.ts        # Profile menu link

SLMS_API/
├── Controllers/AuthController.cs
├── Application/Services/ProfileService.cs
├── Application/Services/Interfaces/IProfileService.cs
└── Application/Contracts/Auth/Responses/UserProfileResponse.cs
```

---

## 5. Test checklist

- [ ] `/profile` loads hero + four tabs
- [ ] Account → Edit → save updates name/email; topbar reflects change
- [ ] Security → wrong current password shows error
- [ ] Security → valid change password succeeds
- [ ] Workspace shows correct institution/branch/library for scoped user
- [ ] SuperAdmin sees platform-wide access message
- [ ] Permissions groups expand/collapse; technical keys toggle
- [ ] Sidebar **Profile** and topbar **Profile** both route correctly
- [ ] `/settings` redirects to `/profile`

---

## 6. Related docs

- [auth-workflow.md](./auth-workflow.md) — Login, guards, JWT
- [administration-workflow.md](./administration-workflow.md) — Roles and permission seeding
- [users-admin-workflow.md](./users-admin-workflow.md) — Admin-managed user scope
