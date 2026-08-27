# Onboarding — Implementation Workflow

End-to-end workflow for **M-03 Onboarding** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-03 · **Route:** `/onboarding/*` · **Depends on:** M-01 Authentication, M-04 Institutions

---

## 1. Overview

Post-registration wizard: institution → branch → library. `onboardingGuard` and `onboardingCompleteGuard` ensure incomplete users stay in the wizard until `OnboardingSteps.Completed`.

```mermaid
flowchart LR
  Login --> Check{Onboarding complete?}
  Check -->|No| OB[/onboarding/institution]
  OB --> BR[/onboarding/branch]
  BR --> LB[/onboarding/library]
  LB --> Dash[/dashboard]
  Check -->|Yes| Dash
```

---

## 2. Angular Workflow (SLMS_UI)

### 2.1 Routing

| Route | Component | File |
|-------|-----------|------|
| `/onboarding` | `OnboardingShell` | `SLMS_UI/src/app/features/onboarding/onboarding-shell.ts` |
| `/onboarding/institution` | `OnBoardingInstitution` | `onboarding/pages/on-boarding-institution/` |
| `/onboarding/branch` | `OnBoardingBranch` | `onboarding/pages/on-boarding-branch/` |
| `/onboarding/library` | `OnBoardingLibrary` | `onboarding/pages/on-boarding-library/` |

Child routes: `onboarding-shell.routes.ts`  
Stepper UI: `institution-onboarding-stepper.component.ts`

**Shell UX:** Header includes **Log out** (`onboarding-shell.ts` → `AuthService.logout()`).

### 2.2 Guards

| Guard | Applied to | Behavior |
|-------|------------|----------|
| `onboardingGuard` | `/login`, `/register`, `/onboarding/*` | Redirects authenticated users to required step or dashboard |
| `onboardingCompleteGuard` | App shell (`authGuard` + this) | Blocks dashboard and other shell routes until onboarding complete |

File: `SLMS_UI/src/app/core/guards/onboarding.guard.ts`

### 2.3 Flow

1. After login, `AuthService` / `CommonService` checks `OnboardingSteps` enum progress.
2. User completes institution form → `POST institutions`.
3. Branch step → institution-scoped branch create.
4. Library step → branch-scoped library create.
5. On completion, redirect to `/dashboard`.

### 2.4 Related enums & models

- `SLMS_UI/src/app/core/enums/OnbardingSteps.ts`
- Institution/branch/library create components reused from main features where possible

---

## 3. .NET Workflow (SLMS_API)

Uses existing CRUD endpoints (no separate onboarding controller):

| Step | API |
|------|-----|
| Institution | `POST /api/v1/institutions` |
| Branch | `POST /api/v1/institutions/{id}/branches` |
| Library | `POST /api/v1/institutions/{id}/branches/{id}/libraries` |
| Current user | `GET /api/v1/auth/current-user` — onboarding flags |

---

## 4. File map

```
SLMS_UI/src/app/features/onboarding/
├── onboarding-shell.ts
├── onboarding-shell.routes.ts
├── onboarding-shell.html
├── institution-onboarding-stepper.component.ts
└── pages/
    ├── on-boarding-institution/
    ├── on-boarding-branch/
    └── on-boarding-library/

SLMS_UI/src/app/features/institutions/institution-create/
SLMS_UI/src/app/features/branches/branch-create/
SLMS_UI/src/app/features/libraries/create-library/
```

---

## 5. Test checklist

- [ ] New user login redirects to `/onboarding/institution`
- [ ] Stepper shows correct active step
- [ ] Cannot skip steps without required data
- [ ] Completed onboarding goes to dashboard on next login
- [ ] Partial progress resumes at correct step
- [ ] Log out from onboarding shell clears session and returns to login
- [ ] Completed user visiting `/onboarding/*` redirects to dashboard

---

## 6. Related docs

- [auth-workflow.md](./auth-workflow.md)
- [institutions-list-workflow.md](./institutions-list-workflow.md)
- [branches-workflow.md](./branches-workflow.md)
- [library-detail-workflow.md](./library-detail-workflow.md)
