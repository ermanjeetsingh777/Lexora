# Onboarding & Tenant Approval — Implementation Workflow

End-to-end workflow for **M-03 Onboarding & Tenant Approvals** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-03 · **Route:** `/onboarding/*`, `/pending-approval`, `/admin/tenant-approvals` · **Depends on:** M-01 Authentication, M-04 Institutions, M-10 Subscriptions, M-18 Tenant & Subscription Approvals

---

## 1. Overview

At registration the user picks **how** the workspace gets created (`RegisterRequest.SetupMode`). From there the wizard (institution → branch → library) is either skipped, walked manually, or deferred. `onboardingGuard` and `onboardingCompleteGuard` route the user by `OnboardingStep` in every case.

| Setup mode | Value | What register does | Where the user lands |
|------------|-------|--------------------|----------------------|
| **Create it for me** (default) | `Auto` = 1 | Creates Institution + Branch + Library server-side | Trial → `/dashboard`; Paid → `/pending-approval` |
| **I'll set it up myself** | `Manual` = 2 | Nothing; step stays `Registered` | `/onboarding/institution` (3-step wizard) |
| **Do it later** | `Later` = 3 | Nothing; forces `PendingApproval` + `ApprovalStatus = Pending` **even on Trial** | `/pending-approval` |

Package rules still apply on top: **Trial** is auto-approved, **Paid** waits for SuperAdmin.

```mermaid
flowchart TD
  Register[User registers: package, addons, setup mode] --> Mode{SetupMode}
  Mode -- Auto --> Bootstrap[API creates Institution + Branch + Library]
  Bootstrap --> CheckTrial{Is Trial Package?}
  Mode -- Manual --> Inst[/onboarding/institution]
  Inst --> Branch[/onboarding/branch]
  Branch --> Lib[/onboarding/library]
  Lib --> CheckTrial
  CheckTrial -- Yes --> Completed[Set Completed -> Navigate to /dashboard]
  CheckTrial -- No --> Pending[/pending-approval - Waiting for SuperAdmin]
  Mode -- Later --> Pending
  Pending --> Contact[SuperAdmin WhatsApp / Call / Email Hotline]
  Pending --> AdminReview{SuperAdmin Reviews Request in Console}
  AdminReview -->|Approve with Final Amount & Remarks| Approved[Account Activated -> /dashboard]
  AdminReview -->|Decline / Request info| Rejected[Status & Remarks Updated on User Page]
```

A `Later` tenant has no Institution/Branch/Library when SuperAdmin approves them, so approval routes them into the wizard instead of the dashboard — see [§3.3](#33-approval-of-a-tenant-without-a-workspace).

---

## 2. Angular Workflow (SLMS_UI)

### 2.1 Routing

| Route | Component | File | Description |
|-------|-----------|------|-------------|
| `/onboarding` | `OnboardingShell` | `SLMS_UI/src/app/features/onboarding/onboarding-shell.ts` | Onboarding container |
| `/onboarding/institution` | `OnBoardingInstitution` | `onboarding/pages/on-boarding-institution/` | Setup tenant institution |
| `/onboarding/branch` | `OnBoardingBranch` | `onboarding/pages/on-boarding-branch/` | Setup first branch |
| `/onboarding/library` | `OnBoardingLibrary` | `onboarding/pages/on-boarding-library/` | Setup first library & submit |
| `/pending-approval` | `PendingApprovalComponent` | `features/auth/pending-approval/` | Waiting for admin confirmation & contact hotline |
| `/admin/tenant-approvals` | `TenantApprovalsComponent` | `features/admin/tenant-approvals/` | SuperAdmin approvals & review console |

### 2.2 Guards

| Guard | Applied to | Behavior |
|-------|------------|----------|
| `onboardingGuard` | `/login`, `/register`, `/onboarding/*`, `/pending-approval` | Directs users to current onboarding step or `/pending-approval` |
| `onboardingCompleteGuard` | App shell (`authGuard` + this) | Blocks dashboard until account is approved (`OnboardingSteps.Completed`) |

### 2.3 Post-Registration & Approval User Experience

1. User registers choosing Package + optional Add-ons + **workspace setup mode**.
2. In `Manual` mode, completes the 3-step setup (Institution -> Branch -> Library). `Auto` skips it; `Later` defers it.
3. On Library creation:
   - If user `ApprovalStatus === 'Approved'` (e.g. Trial user): `onboardingStep` is set to `Completed` (7) and user navigates directly to `/dashboard`.
   - If user `ApprovalStatus === 'Pending'`: `onboardingStep` is set to `PendingApproval` (6) and redirected to `/pending-approval`.
4. `/pending-approval` displays:
   - Live status indicator (Pending review, Approved, or Rejected).
   - SuperAdmin hotline card with direct **"Chat on WhatsApp"**, **"Call Support"**, and **"Email SuperAdmin"** buttons with pre-filled WhatsApp templates.
   - Submitted setup breakdown (Institution, Branch, Library, Plan, Add-ons, Total Calculated Amount).
   - Administrator Remarks / Comments note.
   - "Check Approval Status" button (auto-routes to `/dashboard` when approved).
   - Sign out button.

### 2.4 SuperAdmin Review & Approval Console (`/admin/tenant-approvals`)

- Accessible by SuperAdmin from Admin menu (`Tenant Approvals`).
- Summary KPI counters: Total Registrations, Pending Review, Approved Tenants, Declined / Rejected.
- Search and filter tabs (`All`, `Pending`, `Approved`, `Rejected`).
- "Review & Action" modal:
  - Complete applicant details, organization nodes, base plan, and capacity add-on items.
  - Final Approved Amount field (SuperAdmin can edit/negotiate final billing).
  - Admin Remarks / Comments textarea with quick template buttons ("Payment Verified", "Slip Confirmed", "Slip Required").
  - **Approve & Activate** and **Reject Request** action buttons.
- Mobile: the section switcher and status tabs scroll horizontally (`overflow-x-auto`, `shrink-0 whitespace-nowrap` buttons) and the tables sit in an `overflow-x-auto` wrapper with a `min-w-[900px]` table, so nothing wraps or stretches the page.

### 2.5 Workspace Setup Mode on `/register`

**Files:** `features/auth/register/register.component.{ts,html}` · enum `WorkspaceSetupMode` in `core/enums/OnbardingSteps.ts` · `RegisterRequest` in `core/models/AuthResponse.model.ts`

- Three radio options render under the password fields; **Create it for me** is pre-selected (`setupMode` signal defaults to `WorkspaceSetupMode.Auto`).
- With `Auto` selected, a panel shows the suggested name — **`<Organization> Main`** — and a **Change names** button that reveals editable Institution / Branch / Library name inputs (`customizeNames` signal). Blank fields fall back to the suggested name, and the API applies the same fallback.
- After a successful register the component reads `response.data.user.onboardingStep` and navigates via `CommonService.onboardingConfig`, so the three modes need no route branching in the UI.

### 2.6 Onboarding Form Defaults (Manual mode)

The wizard reuses the standard create screens with `isOnboarding = true`. On init each one pre-fills workspace-wide defaults, only when the field is still empty so a user's own input is never overwritten:

| Screen | Prefill |
|--------|---------|
| `institution-create` | Contact email ← signed-up user's email |
| `branch-create` | Contact email ← signed-up email · Capacity ← `150` (`DEFAULT_ONBOARDING_CAPACITY`) |
| `create-library` | Contact email ← signed-up email |

Outside onboarding (creating a branch/library from the menu) no defaults are applied.

### 2.7 "Your workspace is ready" banner (Auto mode)

**Files:** `core/services/workspace-setup-notice.service.ts` · `shared/components/new-workspace-banner/` · rendered by `dashboard-layout.component.ts`

After an `Auto` registration the register component stores the three generated names in `localStorage` (`lexora_auto_workspace_notice_v1`, keyed by the signing-up email). The dashboard shows a dismissible banner listing the Institution / Branch / Library that were created, with a **Review & rename** link to `/institutions`. Dismissing removes the record, and the banner only renders for the account that registered — the API has no "auto-created" flag, so this is deliberately client-side and one-time.

---

## 3. .NET API Workflow (SLMS_API)

### 3.1 Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/auth/registration-status` | `[Authorize]` | Logged-in tenant fetches approval status, admin remarks & SuperAdmin contact |
| `GET` | `/api/v1/admin/tenant-registrations` | `[Authorize(Roles="SuperAdmin")]` | List tenant registrations with optional status filter |
| `POST` | `/api/v1/admin/tenant-registrations/{userId}/approve` | `[Authorize(Roles="SuperAdmin")]` | Approve tenant registration, unlock onboarding/dashboard access, audit event |
| `POST` | `/api/v1/admin/tenant-registrations/{userId}/reject` | `[Authorize(Roles="SuperAdmin")]` | Reject tenant registration with reason |

### 3.2 Workspace Bootstrap at Registration

**Files:** `Application/Services/AuthService.cs` · `Application/Contracts/Auth/Requests/RegisterRequest.cs` · `Common/Enums/WorkspaceSetupMode.cs`

`RegisterRequest` carries `SetupMode` (defaults to `Auto`) plus optional `InstitutionName`, `BranchName`, `LibraryName`. After the user, package and add-ons are persisted, `RegisterAsync` branches:

- **`Auto`** → `BootstrapDefaultWorkspaceAsync` creates the Institution, then the Branch, then the Library, each marked `IsPrimary = true`, `IsOnboarding = true`, `Status = Active`, with the registered email as contact. Defaults:

  | Setting | Value |
  |---------|-------|
  | Name (all three) | Request value, else `"{Organization} Main"` |
  | Branch / Library capacity | `150` (`DefaultWorkspaceCapacity`) |
  | Branch hours | `06:00` – `18:00` (`DefaultWorkspaceOpenAt` / `DefaultWorkspaceClosesAt`) |

  The org services are resolved from a fresh scope via `IServiceScopeFactory` to avoid circular DI with `AuthService`. Because they advance `OnboardingStep` in *their* `DbContext`, `RegisterAsync` calls `_dbContext.Entry(user).ReloadAsync()` afterwards — without it the response would still carry the stale `Registered` step and push the user back into the wizard.
- **`Later`** → sets `OnboardingStep = PendingApproval`, `ApprovalStatus = "Pending"`, `AdminRemarks = "Library setup deferred — awaiting SuperAdmin approval"`, and clears `ApprovedAtUtc` / `FinalApprovedAmount`. This overrides Trial auto-approval.
- **`Manual`** → nothing; the user stays on `OnboardingStep.Registered` and the wizard takes over.

### 3.3 Approval of a tenant without a workspace

**File:** `Application/Services/AdminService.cs` → `ApproveTenantRegistrationAsync`

Approval no longer forces `OnboardingStep.Completed`. It first checks whether the tenant owns an institution:

```csharp
var hasWorkspace = await _dbContext.Institutions
    .AnyAsync(i => i.CreatedBy == userId && !i.IsDeleted, cancellationToken);

user.OnboardingStep = hasWorkspace ? OnboardingStep.Completed : OnboardingStep.Registered;
```

`ApprovalStatus` becomes `Approved` either way, so the console still shows the tenant as approved and their package/add-ons activate. A `Later` tenant lands on `Registered`, which the guards translate to `/onboarding/institution`; when they finish the library step, `UpdateOnboardingStepAsync` sees `ApprovalStatus == "Approved"` and promotes them straight to `Completed` without a second approval round.

On the UI side `PendingApprovalComponent.checkIfApproved` navigates to `commonService.onboardingConfig[step].route` rather than a hard-coded `/dashboard`, and stores the step the API actually returned.

---

## 4. Database Schema

- `AspNetUsers`: `ApprovalStatus` (`Pending` / `Approved` / `Rejected`), `AdminRemarks`, `FinalApprovedAmount`, `ApprovedAtUtc`, `RejectedAtUtc`, `ApprovedByUserId`.
- `UserPackages`: `ApprovalStatus`, `AdminRemarks`, `FinalApprovedAmount`, `RequestType`, `Note`, `PreviousPackageId`.
- `UserPackageAddons`: `ApprovalStatus`, `AdminRemarks`, `FinalApprovedAmount`.
