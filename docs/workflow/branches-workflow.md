# Branches — Implementation Workflow

End-to-end workflow for **M-05 Branches** (list + detail) across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-05 · **Routes:** `/branches`, `/branches/:branchId` · **Depends on:** M-04 Institutions

---

## 1. Overview

Branches sit between institutions and libraries. The global list mirrors the libraries list pattern: one API load, client filters, grid/table toggle, KPI cards.

```mermaid
flowchart TB
  BL[/branches] --> BLC[BranchListComponent]
  BLC --> GET1[GET /api/v1/branches/list]
  BD[/branches/:id] --> BDC[BranchDetailComponent]
  BDC --> GET2[GET /api/v1/branches/:id]
  BDC --> Nested[Libraries tab / Members tab / Analytics]
```

---

## 2. Angular Workflow (SLMS_UI)

### 2.1 Routing

| Route | Component | File |
|-------|-----------|------|
| `/branches` | `BranchListComponent` | `SLMS_UI/src/app/features/branches/branch-list-component/` |
| `/branches/create` | `BranchCreate` | `SLMS_UI/src/app/features/branches/branch-create/` |
| `/branches/:branchId` | `BranchDetailComponent` | `SLMS_UI/src/app/features/branches/branch-detail-component/` |
| `/branches/:branchId/edit` | `BranchEdit` | `SLMS_UI/src/app/features/branches/branch-edit/` |
| `/branches/:branchId/addlibrary` | `CreateLibrary` | Library create (branch locked) |
| `/branches/:branchId/libraries/:libraryId` | `LibraryDetailComponent` | See [library-detail-workflow.md](./library-detail-workflow.md) |
| `/branches/:branchId/members/*` | Member components | See [scoped-members-workflow.md](./scoped-members-workflow.md) |

Nested under institution: `/institutions/:institutionId/branches/:branchId/*`

### 2.2 Branch list & Entitlements

- **Service:** `BranchService.getListView()` → `GET branches/list`
- **Creation Entitlement & Permission:**
  - `canCreateBranch` computed signal checks `OrganizationEntitlementService.canCreateBranch()` (Basic & Value tiers blocked; Premium & Trial permitted) and `AuthService.hasPermission(PermissionKey.BranchesCreate)`.
- **Filters:** search (debounced), status, occupancy band — client-side after load
- **View modes:** grid (default) | table
- **Pagination:** 12 / 24 / 48 per page (client)

### 2.3 Branch detail

- **Tabs:** overview, libraries, members, analytics (query `?tab=`)
- **Library Creation in Branch:**
  - `canCreateLibrary` checks `OrganizationEntitlementService.canCreateLibrary()` (Value, Premium, Trial permitted; Basic blocked) and `AuthService.hasPermission(PermissionKey.LibrariesCreate)`.
- **Scoped members panel:** [scoped-members-workflow.md](./scoped-members-workflow.md)
- **Utilities:** `branch-detail.util.ts`

---

## 3. .NET Workflow (SLMS_API)

### List (global, user-scoped)

**Controller:** `SLMS_API/Controllers/BranchListController.cs`  
**Route:** `api/v1/branches`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/list` | Portfolio list + KPIs |
| GET | `/{branchId}` | Detail view for global route |

### CRUD (institution-scoped)

**Controller:** `SLMS_API/Controllers/BranchesController.cs`  
**Route:** `api/v1/institutions/{institutionId}/branches`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List for institution |
| POST | `/` | Create branch |
| GET | `/{branchId}` | Get branch |
| PUT | `/{branchId}` | Update |
| DELETE | `/{branchId}` | Delete |
| GET | `/{branchId}/analytics` | Analytics tab |

---

## 4. File map

```
SLMS_UI/src/app/features/branches/
├── branch-list-component/
├── branch-detail-component/
├── branch-create/
├── branch-edit/
└── branch.service.ts

SLMS_API/
├── Controllers/BranchListController.cs
├── Controllers/BranchesController.cs
└── Application/Services/BranchService.cs
```

---

## 5. Test checklist

- [ ] Branch list KPIs and cards render
- [ ] Occupancy / status filters work client-side
- [ ] Navigate list → detail → libraries tab
- [ ] Create branch from `/branches/create` and institution nested route
- [ ] Edit branch saves via institution-scoped PUT
- [ ] Scoped members tab loads under branch detail

---

## 6. Related docs

- [institution-detail-workflow.md](./institution-detail-workflow.md) — Branches tab
- [libraries-list-workflow.md](./libraries-list-workflow.md)
- [library-detail-workflow.md](./library-detail-workflow.md)
- [scoped-members-workflow.md](./scoped-members-workflow.md)
