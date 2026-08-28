# Institutions List — Implementation Workflow

End-to-end workflow for the **M-04 Institutions list** feature across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-04 · **Route:** `/institutions` · **Depends on:** M-01 Authentication

> Institution **detail** tabs: [institution-detail-workflow.md](./institution-detail-workflow.md)

---

## 1. Overview

| Layer | Entry | Strategy |
|-------|--------|----------|
| **Angular** | Route `/institutions` | Server list + debounced search; client type filter; quick-view side panel |
| **.NET** | `GET /api/v1/institutions/list` | User-scoped institution portfolio with KPIs and insights |

```mermaid
flowchart LR
  A[/institutions] --> B[InstitutionsListComponent]
  B --> C[InstitutionsService.getListView]
  C --> D[GET institutions/list]
  D --> E[(Institutions + aggregates)]
```

---

## 2. Angular Workflow (SLMS_UI)

### 2.1 Routing

| Route | Component | File |
|-------|-----------|------|
| `/institutions` | `InstitutionsListComponent` | `SLMS_UI/src/app/features/institutions/institutions-list/` |
| `/institutions/create` | `InstitutionCreate` | `SLMS_UI/src/app/features/institutions/institution-create/` |
| `/institutions/:institutionId` | `InstitutionDetailComponent` | See [institution-detail-workflow.md](./institution-detail-workflow.md) |

Navigation: sidebar **Institutions** → `/institutions`

### 2.2 Page layout

```
PageHeader (New institution → /institutions/create)
├── KPI row (institutions, members, revenue, alerts)
├── Filter bar (search debounced, type filter)
├── Institution cards / table with trend sparklines
├── Quick-view slide-over (overview, activity, trends)
└── Empty / loading / error states
```

### 2.3 State & Entitlements

- **Signals:** `items`, `summary`, `loading`, search, type filter
- **Creation Entitlement & Permission:**
  - `canCreateInstitution` computed signal checks both `OrganizationEntitlementService.canCreateInstitution()` (Basic & Value tiers cannot add institutions; Premium & Trial can) and `AuthService.hasPermission(PermissionKey.InstitutionsCreate)`.
- **Quick view:** Loads `GET institutions/{id}/quick-view` on card eye-click
- **Trend charts:** SVG built client-side via `institutions-list.util.ts`

---

## 3. .NET Workflow (SLMS_API)

**Controller:** `SLMS_API/Controllers/InstitutionsController.cs`  
**Base route:** `api/v1/institutions`

| Method | Endpoint | Used by list |
|--------|----------|--------------|
| GET | `/list` | Main list + KPIs |
| GET | `/{id}/quick-view` | Side panel |
| GET | `/dropdown` | Filters elsewhere |
| POST | `/` | Create institution |
| GET | `/{id}` | Detail header |
| PUT | `/{id}` | Update |
| DELETE | `/{id}` | Soft delete |

---

## 4. File map

```
SLMS_UI/src/app/features/institutions/
├── institutions-list/
│   ├── institutions-list.ts
│   ├── institutions-list.html
│   └── institutions-list.util.ts
├── institution-create/
├── institution-detail/          → detail workflow
└── institutions.service.ts

SLMS_API/
├── Controllers/InstitutionsController.cs
├── Application/Services/InstitutionService.cs
└── Application/Helpers/InstitutionQuickViewHelper.cs
```

---

## 5. Test checklist

- [ ] List loads with KPIs for authorized user scope
- [ ] Search debounce triggers new API call
- [ ] Type filter narrows visible cards
- [ ] Quick-view opens without route change
- [ ] Card link navigates to `/institutions/:id`
- [ ] Create institution from header action

---

## 6. Related docs

- [institution-detail-workflow.md](./institution-detail-workflow.md)
- [scoped-members-workflow.md](./scoped-members-workflow.md)
- [branches-workflow.md](./branches-workflow.md)
