# Administration (Users, Roles & Permissions) — Implementation Workflow

End-to-end workflow for **M-15 Administration** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-15 · **Owner:** Platform / Security · **Depends on:** M-01 Authentication

---

## 1. Overview

| Layer | Entry | Strategy |
|-------|--------|----------|
| **Angular** | Routes `/users`, `/roles`, `/unauthorized` | Admin KPIs, user directory, role catalogue, permission diff UI |
| **.NET** | `GET /api/v1/admin/*` | User CRUD, role CRUD, permission matrix, audit/governance feed |

```mermaid
flowchart LR
  A[Admin opens /users or /roles] --> B[permissionGuard]
  B -->|allowed| C[UsersList / RolesList]
  B -->|denied| D[/unauthorized]
  C --> E[AdminService]
  E --> F[AdminController]
  F --> G[(AspNetUsers / AspNetRoles / RolePermissions)]
```

### Business rules (M-15)

| Rule | Implementation |
|------|----------------|
| **BR-15.1** Role baseline ± overrides | `RolePermissionDefinitions` + per-user overrides (future) |
| **BR-15.2** Role change previews diff | Role editor compares selected vs baseline permissions |
| **BR-15.3** Cannot delete assigned role | API validates user count before role delete |
| **BR-15.4** Last admin protected | API blocks demote/deactivate last admin |
| **BR-15.5** Governance trail | `AdminService` audit logs on role/permission changes |

### Functional requirements

| ID | Requirement | Status |
|----|-------------|--------|
| FR-15.1 | List users with role, status, last activity | Done |
| FR-15.2 | Create user with role assignment | Done |
| FR-15.3 | Edit user (profile, active status, roles) | Done |
| FR-15.4 | Visual permission diff (added/removed badges) | Planned |
| FR-15.5 | Role catalogue + permission matrix | Done |
| FR-15.6 | Create/edit roles with change summary | Done |
| FR-15.7 | Governance feed | API audit logs · UI pending |
| FR-15.8 | Gate admin routes (`permissionGuard`) | Done |

---

## 2. Roles (predefined)

Aligned with `SLMS_API/Common/Constants/RoleDefinitions.cs`:

| Role | Typical scope |
|------|----------------|
| `SuperAdmin` | All permissions (109 CRUD keys + scanner) |
| `OrganisationAdmin` / `OrganisationManager` | Platform operator across org |
| `InstitutionAdmin` / `InstitutionManager` | Institution + branches + libraries |
| `BranchAdmin` / `BranchManager` | Branch operations |
| `LibrarianAdmin` / `LibrarianManager` / `Librarians` | Library & books |
| `Teachers` | Read-only teaching views |
| `Members` | Member portal (self-service) |

---

## 3. Permission model (CRUD per module)

Each module has six actions (numeric IDs are contiguous):

| Action | Claim code example | Typical use |
|--------|-------------------|-------------|
| View | `members.view` | Detail page |
| List | `members.list` | Grid / directory |
| Create | `members.create` | POST |
| Edit | `members.edit` | Form load |
| Update | `members.update` | PUT/PATCH |
| Delete | `members.delete` | DELETE |

**Modules (18):** Dashboard, Members, Seats, Attendance, Institutions, Branches, Libraries, Subscriptions, Payments, Books, Inventory, **Users**, **Roles**, Reports, Notifications, Profile, Settings, Support.

**Special:** `attendance.scanner.use` (ID 109).

**Source of truth:**
- API enum: `SLMS_API/Common/Enums/PermissionKey.cs`
- Role map: `SLMS_API/Common/Constants/RolePermissionDefinitions.cs`
- Angular: `SLMS_UI/src/app/core/constants/permissions.ts`
- Role catalogue UI: `SLMS_UI/src/app/core/constants/role-permissions.ts`

**SuperAdmin:** `PermissionModuleDefinitions.AllPermissions()` — every enum value.

---

## 4. Angular workflow (SLMS_UI)

### 4.1 Routes

| Route | Component | Guard |
|-------|-----------|-------|
| `/users` | `UsersListComponent` | `permissionGuard` → `UsersList` |
| `/roles` | `RolesListComponent` | `permissionGuard` → `RolesList` |
| `/unauthorized` | `UnauthorizedComponent` | Public |

### 4.2 Permission check flow

1. Login stores `CurrentUser.permissions: number[]` in `StorageService`.
2. `AuthService.hasPermission(id)` checks numeric permission IDs.
3. `permissionGuard` reads `route.data.permission` and redirects to `/unauthorized` if missing.
4. Sidebar Admin links use `*hasPermission` directive (optional) or guard-only.

### 4.3 Key files

```
SLMS_UI/src/app/
  core/constants/permissions.ts       # PermissionKey enum + module helpers
  core/constants/role-permissions.ts # 12 roles + default permission sets
  core/guards/permission.guard.ts
  core/services/admin.service.ts
  core/models/admin.models.ts
  features/admin/users-list/
  features/admin/roles-list/
```

### 4.4 API integration

| UI action | Endpoint | Permission |
|-----------|----------|------------|
| List users | `GET /api/v1/admin/users` | `UsersList` (68) |
| Create user | `POST /api/v1/admin/users` | `UsersCreate` (69) |
| List roles | `GET /api/v1/admin/roles` | `RolesList` (74) |
| Permission catalogue | `GET /api/v1/admin/permissions` | `RolesView` (73) |
| Assign role permissions | `PUT /api/v1/admin/roles/{id}/permissions` | `RolesUpdate` (77) |

---

## 5. .NET workflow (SLMS_API)

### 5.1 Controllers

`SLMS_API/Controllers/AdminController.cs` — granular `[Permission]` attributes per HTTP verb.

### 5.2 Seeding

On startup (`DbSeeder.MigrateAndSeedAsync`):
1. `MigrateAsync()` — includes `ReseedCrudPermissions` migration
2. `SeedRolesAsync()` — ensures all 12 Identity roles exist
3. `SeedRolePermissionsAsync()` — **syncs** role permissions to `RolePermissionDefinitions` (adds missing, removes stale)

### 5.3 JWT claims

`JwtTokenService` emits `permission` claims using `permission.ToClaimValue()` (e.g. `users.list`).

---

## 6. Acceptance criteria checklist

- [ ] SuperAdmin can access `/users` and `/roles`
- [ ] Member role navigating to `/roles` lands on `/unauthorized`
- [ ] Switching user role shows permission diff before save (UI)
- [ ] Role with assigned users cannot be deleted (API error surfaced in UI)
- [ ] Permission matrix on `/roles` matches `RolePermissionDefinitions` baseline

---

## 7. Related workflows

- [Users & roles workflow](./users-admin-workflow.md) — create/edit users, assign roles, permission matrix
- [Libraries list workflow](./libraries-list-workflow.md)
- [Members list workflow](./members-list-workflow.md)
- [Scoped members workflow](./scoped-members-workflow.md)
- [Books workflow](./books-workflow.md)
- [Attendance QR kiosk](./attendance-kiosk-workflow.md) — uses `attendance.scanner.use` (ID 109)

---

## 8. Gaps / next steps

| Item | Notes |
|------|-------|
| User activity timeline | See [users-admin-workflow.md](./users-admin-workflow.md) §8 |
| Governance feed UI | Wire `GET /api/v1/admin/audit-logs` |
| Per-user permission overrides | BR-15.1 explicit overrides table |
| SCIM / JIT elevation | Out of scope per M-15 |
