# Onboarding & Tenant Approval — Implementation Workflow

End-to-end workflow for **M-03 Onboarding & Tenant Approvals** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-03 · **Route:** `/onboarding/*`, `/pending-approval`, `/admin/approvals` · **Depends on:** M-01 Authentication, M-04 Institutions, M-10 Subscriptions

---

## 1. Overview

Post-registration wizard: institution → branch → library → **SuperAdmin Approval Pending**. `onboardingGuard` and `onboardingCompleteGuard` ensure that newly registered organizations complete setup, then wait on `/pending-approval` with live SuperAdmin contact information until an administrator reviews and approves their account.

```mermaid
flowchart TD
  Register[User Registers with Package & Addons] --> Inst[/onboarding/institution]
  Inst --> Branch[/onboarding/branch]
  Branch --> Lib[/onboarding/library]
  Lib --> Pending[/pending-approval - Waiting for SuperAdmin]
  Pending --> Contact[SuperAdmin WhatsApp / Call / Email Contact Hotline]
  Pending --> AdminReview{SuperAdmin Reviews Request}
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
| `/admin/approvals` | `TenantApprovalsComponent` | `features/admin/tenant-approvals/` | SuperAdmin approvals & review console |

### 2.2 Guards

| Guard | Applied to | Behavior |
|-------|------------|----------|
| `onboardingGuard` | `/login`, `/register`, `/onboarding/*`, `/pending-approval` | Directs users to current onboarding step or `/pending-approval` |
| `onboardingCompleteGuard` | App shell (`authGuard` + this) | Blocks dashboard until account is approved (`OnboardingSteps.Completed`) |

### 2.3 Post-Registration & Approval User Experience

1. User registers choosing Package + optional Add-ons.
2. Complete 3-step setup (Institution -> Branch -> Library).
3. On Library creation, `onboardingStep` is set to `PendingApproval` (6) and redirected to `/pending-approval`.
4. `/pending-approval` displays:
   - Live status indicator (Pending review, Approved, or Rejected).
   - SuperAdmin hotline card with direct **"Chat on WhatsApp"**, **"Call Support"**, and **"Email SuperAdmin"** buttons.
   - Submitted setup breakdown (Institution, Branch, Library, Plan, Add-ons, Total Calculated Amount).
   - Administrator Remarks / Comments note.
   - "Check Approval Status" button (auto-routes to `/dashboard` when approved).
   - Sign out button.

### 2.4 SuperAdmin Review & Approval Console (`/admin/approvals`)

- Accessible by SuperAdmin from Admin menu (`Tenant Approvals`).
- Summary KPI counters: Total Registrations, Pending Review, Approved Tenants, Declined / Rejected.
- Search and filter tabs (`All`, `Pending`, `Approved`, `Rejected`).
- "Review & Action" modal:
  - Complete applicant details, organization nodes, base plan, and capacity add-on items.
  - Final Approved Amount field (SuperAdmin can edit/negotiate final billing).
  - Admin Remarks / Comments textarea with quick template buttons ("Payment Verified", "Special Price Approved", "Slip Required", "Contact Unreachable").
  - **Approve & Activate** and **Reject Request** action buttons.

---

## 3. .NET API Workflow (SLMS_API)

### 3.1 Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/v1/auth/registration-status` | `[Authorize]` | Logged-in tenant fetches approval status, admin remarks & SuperAdmin contact |
| `GET` | `/api/v1/admin/registrations` | `[Authorize(Roles="SuperAdmin")]` | List tenant registrations with optional `?status=pending/approved/rejected` |
| `GET` | `/api/v1/admin/registrations/{userId}` | `[Authorize(Roles="SuperAdmin")]` | Get full registration details for review |
| `POST` | `/api/v1/admin/registrations/{userId}/approve` | `[Authorize(Roles="SuperAdmin")]` | Approve registration, set final amount, remarks & activate tenant account |
| `POST` | `/api/v1/admin/registrations/{userId}/reject` | `[Authorize(Roles="SuperAdmin")]` | Reject registration with mandatory reason/comment |

### 3.2 Database & Domain Entities

- `ApplicationUser`:
  - `ApprovalStatus` (`Pending`, `Approved`, `Rejected`)
  - `AdminRemarks` (string?)
  - `FinalApprovedAmount` (decimal?)
  - `ApprovedAtUtc` / `RejectedAtUtc`
  - `ApprovedByUserId`
- `OnboardingStep` Enum:
  - `Registered = 1`
  - `Institute = 2`
  - `Branch = 3`
  - `Library = 4`
  - `Completed = 5`
  - `PendingApproval = 6`
  - `Rejected = 7`
