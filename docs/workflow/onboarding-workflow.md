# Onboarding & Tenant Approval — Implementation Workflow

End-to-end workflow for **M-03 Onboarding & Tenant Approvals** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-03 · **Route:** `/onboarding/*`, `/pending-approval`, `/admin/tenant-approvals` · **Depends on:** M-01 Authentication, M-04 Institutions, M-10 Subscriptions, M-18 Tenant & Subscription Approvals

---

## 1. Overview

Post-registration wizard: institution → branch → library → **Dashboard or SuperAdmin Approval Pending**. `onboardingGuard` and `onboardingCompleteGuard` ensure that newly registered organizations complete setup:
- If on a **Trial** package: The user is auto-approved upon completing library setup and lands directly on `/dashboard`.
- If on a **Paid** package: The user transitions to `PendingApproval` and is routed to `/pending-approval` with SuperAdmin contact hotline details until reviewed and activated.

```mermaid
flowchart TD
  Register[User Registers with Package & Addons] --> Inst[/onboarding/institution]
  Inst --> Branch[/onboarding/branch]
  Branch --> Lib[/onboarding/library]
  Lib --> CheckTrial{Is Trial Package?}
  CheckTrial -- Yes --> Completed[Set Completed -> Navigate to /dashboard]
  CheckTrial -- No --> Pending[/pending-approval - Waiting for SuperAdmin]
  Pending --> Contact[SuperAdmin WhatsApp / Call / Email Hotline]
  Pending --> AdminReview{SuperAdmin Reviews Request in Console}
  AdminReview -->|Approve with Final Amount & Remarks| Approved[Account Activated -> /dashboard]
  AdminReview -->|Decline / Request info| Rejected[Status & Remarks Updated on User Page]
```

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

1. User registers choosing Package + optional Add-ons.
2. Completes 3-step setup (Institution -> Branch -> Library).
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

---

## 3. .NET API Workflow (SLMS_API)

### 3.1 Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/auth/registration-status` | `[Authorize]` | Logged-in tenant fetches approval status, admin remarks & SuperAdmin contact |
| `GET` | `/api/v1/admin/tenant-registrations` | `[Authorize(Roles="SuperAdmin")]` | List tenant registrations with optional status filter |
| `POST` | `/api/v1/admin/tenant-registrations/{userId}/approve` | `[Authorize(Roles="SuperAdmin")]` | Approve tenant registration, unlock onboarding/dashboard access, audit event |
| `POST` | `/api/v1/admin/tenant-registrations/{userId}/reject` | `[Authorize(Roles="SuperAdmin")]` | Reject tenant registration with reason |

---

## 4. Database Schema

- `AspNetUsers`: `ApprovalStatus` (`Pending` / `Approved` / `Rejected`), `AdminRemarks`, `FinalApprovedAmount`, `ApprovedAtUtc`, `RejectedAtUtc`, `ApprovedByUserId`.
- `UserPackages`: `ApprovalStatus`, `AdminRemarks`, `FinalApprovedAmount`, `RequestType`, `Note`, `PreviousPackageId`.
- `UserPackageAddons`: `ApprovalStatus`, `AdminRemarks`, `FinalApprovedAmount`.
