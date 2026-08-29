# Package Entitlements, Add-ons & RBAC Authorization — Implementation Workflow

End-to-end workflow for **M-17 Package Entitlements, Capacity Add-ons & RBAC Authorization** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-17 · **Scope:** Global Entitlements, Quotas, Add-ons & Permissions

---

## 1. Overview

Lexora implements a dynamic capacity & dual-layer access control model:
1. **Subscription Package Entitlements & Capacity Quotas:** Controls quantitative resource creation limits based on the organization's base subscription tier (`Basic`, `Value`, `Premium` / `Trial`) plus any active **Capacity Add-ons** (`Addon`).
2. **Active State Scoping:** Limits only apply to **Active** records (`IsActive == true` and `IsDeleted == false`). Inactive members and users do not count against the entitlement quota.
3. **SuperAdmin Dynamic Controls:** SuperAdmin can update prices, duration, and quota limits (`MaxInstitutions`, `MaxBranches`, `MaxLibraries`, `MaxUsers`, `MaxMembers`) for packages and add-ons at runtime without recompilation.
4. **Role-Based Access Control (RBAC):** Controls granular functional capabilities using `PermissionKey` claims assigned to user roles. `SuperAdmin` bypasses permission checks globally.

```mermaid
flowchart TD
  Req[User attempts to Create Resource / Action] --> EntitlementCheck{Active Count < Dynamic Limit (Base Package + Addons)?}
  EntitlementCheck -- No --> BlockEntitlement[Reject: Purchase Add-on or Upgrade Package / Hide Button]
  EntitlementCheck -- Yes --> PermCheck{Has PermissionKey Claim or SuperAdmin?}
  PermCheck -- No --> BlockPerm[403 Forbidden / Hide Action]
  PermCheck -- Yes --> Allow[Execute API / Show Action]
```

---

## 2. Subscription Package & Add-on Rules

### 2.1 Default Package Quotas (Configurable by SuperAdmin)

| Package Code | Package Name | Max Institutions | Max Branches | Max Libraries | Max Staff Users | Max Active Members |
|--------------|--------------|------------------|--------------|---------------|-----------------|--------------------|
| `BASIC` | Basic Plan | 1 | 1 | 1 | 2 | 200 |
| `VALUE` | Value Plan | 2 | 2 | 2 | 4 | 400 |
| `PREMIUM` | Premium Plan | 5 | 5 | 5 | 10 | 1000 |
| `TRIAL` | Free Trial | 1 | 1 | 1 | 2 | 50 |

### 2.2 Capacity Add-ons (`Addon` Entity)

Organizations can expand quotas without upgrading the whole plan by purchasing add-ons:
- **Additional Library** (`ADDON_LIBRARY`): +1 Library
- **100 Active Members Pack** (`ADDON_MEMBERS_100`): +100 Active Members
- **200 Active Members Pack** (`ADDON_MEMBERS_200`): +200 Active Members
- **Additional Staff User** (`ADDON_USER`): +1 Staff User
- **Additional Branch** (`ADDON_BRANCH`): +1 Branch
- **Additional Institution** (`ADDON_INSTITUTION`): +1 Institution

---

## 3. .NET Workflow (SLMS_API)

### 3.1 Package Entitlement Service

**Interface:** `SLMS_API/Application/Services/Interfaces/IPackageEntitlementService.cs`  
**Implementation:** `SLMS_API/Application/Services/PackageEntitlementService.cs`  
**DTO:** `SLMS_API/Application/Contracts/Package/Response/OrganizationEntitlementsResponse.cs`

- Calculates total allowed limits: `package.Max{Resource} + sum(active_addons.TotalExtraQuantity)`.
- Counts only **Active** resources linked to the user's scope.
- Provides verification methods:
  - `EnsureCanCreateInstitutionAsync(userId, isOnboarding)`
  - `EnsureCanCreateBranchAsync(userId, isOnboarding)`
  - `EnsureCanCreateLibraryAsync(userId, isOnboarding)`
  - `EnsureCanCreateUserAsync(userId)`
  - `EnsureCanCreateMemberAsync(userId, countToAdd)`

### 3.2 Add-ons Controller & Service

**Controller:** `SLMS_API/Controllers/AddonsController.cs`  
**Service:** `SLMS_API/Application/Services/AddonService.cs`  
- `GET /api/v1/addons`: Public/Active list of capacity add-ons
- `GET /api/v1/addons/all`: SuperAdmin management list
- `POST /api/v1/addons`: SuperAdmin create add-on
- `PUT /api/v1/addons/{id}`: SuperAdmin update add-on
- `POST /api/v1/addons/purchase`: User purchases an add-on; immediately updates user's entitlement limits
- `GET /api/v1/addons/my-addons`: User's active capacity add-ons

### 3.3 Packages Controller (SuperAdmin Management)

**Controller:** `SLMS_API/Controllers/PackagesController.cs`  
**Service:** `SLMS_API/Application/Services/PackageService.cs`  
- `GET /api/v1/packages`: Public list of active packages
- `GET /api/v1/packages/all`: SuperAdmin list with full quota breakdowns
- `POST /api/v1/packages` & `PUT /api/v1/packages/{id}`: SuperAdmin create/update packages, quotas, and pricing

---

## 4. Angular UI Workflow (SLMS_UI)

### 4.1 Entitlement Service & Models

- `OrganizationEntitlementService`: Central signal-based entitlement store with `canCreateInstitution`, `canCreateBranch`, `canCreateLibrary`, `canCreateUser`, `canCreateMember`.
- Computed permission checks in `UsersListComponent` and `MembersListComponent` combine `hasPermission` with `canCreateUser()` / `canCreateMember()`.

### 4.2 Registration with Optional Add-ons

- `RegisterComponent` loads active packages and active add-ons.
- Displays live package quota cards (Institutions, Branches, Libraries, Users, Members).
- Allows users to customize and add capacity add-ons during initial registration with live total pricing calculations.

### 4.3 Subscriptions & Quotas Management Screen

- `SubscriptionsComponent` displays current plan, active add-ons, full package grid with quota details, capacity add-on catalog with 1-click purchase, and SuperAdmin dialogs to dynamically edit package and add-on prices and quotas.
