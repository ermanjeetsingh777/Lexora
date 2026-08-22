# Attendance QR Kiosk — Implementation Workflow

End-to-end workflow for **M-13 Attendance QR Kiosk** across **SLMS_UI** (Angular) and **SLMS_API** (.NET).

**Module ID:** M-13 · **Owner:** Operations / Front desk · **Depends on:** M-06 Members, M-08 Libraries

---

## 1. Overview

Two QR-based attendance flows — **no login required** on public kiosk pages:

| Flow | QR owner | Scan opens | User action |
|------|----------|------------|-------------|
| **Library kiosk** | One shared QR per library | Member list for that library | Select member → Check in / Check out |
| **Member kiosk** | One personal QR per member | Member self-service screen | Check in / Check out directly |

Staff can generate and print QR codes from authenticated admin pages.

```mermaid
flowchart TB
  subgraph public [Public — no login]
    LQR[Library QR scan] --> LK[/kiosk/attendance/library]
    MQR[Member QR scan] --> MK[/kiosk/attendance/member]
    LK --> APIK[AttendanceKioskController]
    MK --> APIK
  end

  subgraph staff [Staff — login + permission]
    SC[/attendance/scanner] --> APIS[AttendanceScannerController]
    MD[Member details → Attendance QR] --> APIS
  end

  APIK --> SVC[AttendanceScannerService]
  APIS --> SVC
  SVC --> ATT[AttendanceService CheckIn / CheckOut]
  ATT --> DB[(Members / Libraries / MemberAttendances)]
```

### Business rules

| Rule | Implementation |
|------|----------------|
| **BR-13.1** Library QR resolves exactly one active library | `Library.AttendanceQrToken` unique index; `ResolveLibraryAsync` |
| **BR-13.2** Member must belong to library for library-kiosk actions | `EnsureMemberInLibraryAsync` |
| **BR-13.3** Member QR uses current library assignment | `MemberLibraries` where `IsCurrent`, fallback latest `JoinedOn` |
| **BR-13.4** One check-in and one check-out per day | `AttendanceService` + `GetMemberStatusAsync` suggested action |
| **BR-13.5** Public APIs secured by token, not JWT | `[AllowAnonymous]` on kiosk controller; token in query/body |
| **BR-13.6** Attendance source = QR | `AttendanceSource.QRCode` on scanner record |
| **BR-13.7** One device → one member per day (kiosk) | `KioskDeviceService` + `EnsureDeviceAllowsMemberAsync`; staff scanner exempt (`staff:` prefix) |

### Functional requirements

| ID | Requirement | Status |
|----|-------------|--------|
| FR-13.1 | Library common QR generation | Done |
| FR-13.2 | Public library kiosk — member list + check-in/out | Done |
| FR-13.3 | Member personal QR generation | Done |
| FR-13.4 | Public member kiosk — self check-in/out | Done |
| FR-13.5 | Staff scanner page (authenticated) | Done |
| FR-13.6 | Member QR on member details (print) | Done |
| FR-13.7 | Camera QR scanning in browser | Planned |
| FR-13.8 | Library list QR print UI | Planned |
| FR-13.9 | One device per member (QR kiosk) | Done |

---

## 2. Angular Workflow (SLMS_UI)

### 2.1 Routing

| Route | Auth | Component | Purpose |
|-------|------|-----------|---------|
| `/kiosk/attendance/library?token=` | **None** | `LibraryKioskComponent` | Library QR → member picker → attendance |
| `/kiosk/attendance/member?token=` | **None** | `MemberKioskComponent` | Member QR → self check-in/out |
| `/attendance/scanner?token=` | `attendance.scanner.use` | `AttendanceScannerComponent` | Staff scanner + QR display |

Route config: `SLMS_UI/src/app/app.routes.ts`  
Kiosk routes are **outside** `AppShellComponent` and have no `permissionGuard`.

### 2.2 Public kiosk pages

```
LibraryKioskComponent
├── Header (library / branch / institution)
├── Member list (search + select)
└── Action panel
    ├── Today's check-in / check-out times
    ├── Check in | Check out | Auto buttons
    └── Action hint text

MemberKioskComponent
├── Member name + membership no + library
├── Status badge + today's times
└── Check in | Check out | Auto buttons (full width)
```

**Files:**

| File | Role |
|------|------|
| `features/attendance/kiosk/library-kiosk.component.ts` | Library kiosk logic |
| `features/attendance/kiosk/library-kiosk.component.html` | Library kiosk UI |
| `features/attendance/kiosk/library-kiosk.component.css` | Kiosk button styles (enabled + disabled) |
| `features/attendance/kiosk/member-kiosk.component.ts` | Member self-service logic |
| `features/attendance/kiosk/member-kiosk.component.html` | Member kiosk UI |
| `features/attendance/kiosk/member-kiosk.component.css` | Shared kiosk button styles |
| `core/services/attendance-kiosk.service.ts` | Public API client (`attendance/kiosk/*`) |
| `core/services/kiosk-device.service.ts` | Persistent browser `deviceId`; local member binding |
| `core/services/attendance-scanner.service.ts` | Staff API client (`attendance/scanner/*`) |
| `core/models/attendanceModels.ts` | `Scanner*`, `MemberScanner*`, `MemberQrCode` types |

### 2.3 Member details integration

Member profile **Overview** tab shows **Attendance QR** card (staff view):

- `GET attendance/scanner/members/{memberId}/qr`
- Displays QR image + scan URL for printing member badge

File: `features/members/member-details-component/`

### 2.4 Suggested action UX

Buttons use custom `.kiosk-btn` styles (not theme `app-button`) for dark kiosk background:

| State | Visual |
|-------|--------|
| **Enabled** | Color-coded (green check-in, amber check-out, blue auto) |
| **Disabled** | Flat slate + dashed border, muted text |
| **Active action** | White ring highlight on the currently available action |
| **Hint** | Text below: e.g. "Tap Check in or use Auto to mark arrival." |

---

## 3. .NET Workflow (SLMS_API)

### 3.1 Controllers

| Controller | Auth | Base route |
|------------|------|------------|
| `AttendanceKioskController` | `[AllowAnonymous]` | `api/v1/attendance/kiosk` |
| `AttendanceScannerController` | JWT + `attendance.scanner.use` | `api/v1/attendance/scanner` |
| `AttendanceController` | JWT (staff) | `api/v1/attendance` |

### 3.2 Public kiosk endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/library/context?token=` | Resolve library from QR token |
| `GET` | `/library/members?token=&search=` | List members in library (max 50) |
| `GET` | `/library/members/{id}/status?token=` | Today's attendance status |
| `POST` | `/library/record` | Check in/out via library token + member id; body includes `deviceId` |
| `GET` | `/member/context?token=&deviceId=` | Resolve member from personal QR token; validates device binding |
| `GET` | `/member/status?token=` | Member's today status |
| `POST` | `/member/record` | Check in/out via member token; body includes `deviceId` |

### 3.3 Staff scanner endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/context?token=` | Same as kiosk library context |
| `GET` | `/members?token=` | Member search |
| `GET` | `/members/{id}/status?token=` | Member status |
| `POST` | `/record` | Record attendance |
| `GET` | `/libraries/{libraryId}/qr` | Generate library QR image (base64 PNG) |
| `GET` | `/members/{memberId}/qr` | Generate member QR image (base64 PNG) |

### 3.4 Service layer

**`AttendanceScannerService`** (`Application/Services/AttendanceScannerService.cs`):

- `GetContextAsync` — library token → context; auto-generates `AttendanceQrToken` on library if missing
- `SearchMembersAsync` — active members in library
- `GetMemberStatusAsync` — today's check-in/out + `SuggestedAction` (`check-in` | `check-out` | `done`)
- `RecordAsync` / `RecordByMemberTokenAsync` — delegates to `IAttendanceService` with `Source = QRCode`
- `EnsureDeviceAllowsMemberAsync` — rejects QR attendance when `deviceId` already used for another member today (skipped for `staff:` prefix)
- `GetMemberContextAsync` — optional `deviceId` query validates binding before member kiosk loads
- `GetQrCodeAsync` / `GetMemberQrCodeAsync` — QRCoder PNG base64 + scan URL

### 3.5 Domain & database

| Entity | Field | Notes |
|--------|-------|-------|
| `Library` | `AttendanceQrToken` | Unique, auto-generated on first use |
| `Member` | `AttendanceQrToken` | Unique, set on create; lazy-generated for existing members |

**Migrations:**

- `20260815140000_AddLibraryAttendanceQrToken`
- `20260816061655_AddMemberAttendanceQrToken`

### 3.6 Configuration

`appsettings.Development.json`:

```json
"Attendance": {
  "ScannerUrlBase": "http://localhost:4200/kiosk/attendance/library",
  "LibraryKioskUrlBase": "http://localhost:4200/kiosk/attendance/library",
  "MemberKioskUrlBase": "http://localhost:4200/kiosk/attendance/member"
}
```

Production must set these to the deployed Angular origin.

### 3.7 Permissions

| Key | ID | Used by |
|-----|-----|---------|
| `attendance.scanner.use` | 109 | Staff scanner page, QR generation APIs |

Kiosk public endpoints do **not** require this permission.

---

## 4. End-to-end flows

### 4.1 Library QR attendance (kiosk)

```mermaid
sequenceDiagram
  participant U as User (no login)
  participant UI as LibraryKioskComponent
  participant API as AttendanceKioskController
  participant S as AttendanceScannerService

  U->>UI: Scan library QR (?token=...)
  UI->>API: GET /library/context
  API->>S: GetContextAsync
  S-->>UI: library name, token
  UI->>API: GET /library/members
  S-->>UI: member list
  U->>UI: Select member + Check in
  UI->>API: POST /library/record
  S->>S: CheckInAsync (source=QRCode)
  S-->>UI: success message
```

### 4.2 Member QR attendance (kiosk)

```mermaid
sequenceDiagram
  participant M as Member (no login)
  participant UI as MemberKioskComponent
  participant API as AttendanceKioskController
  participant S as AttendanceScannerService

  M->>UI: Scan member QR (?token=...)
  UI->>API: GET /member/context
  S-->>UI: name, library
  UI->>API: GET /member/status
  M->>UI: Tap Auto
  UI->>API: POST /member/record
  S->>S: Resolve library from member → RecordAsync
  S-->>UI: checked in / out
```

---

## 5. File map

```
SLMS_API/
├── Controllers/
│   ├── AttendanceKioskController.cs      # Public kiosk APIs
│   ├── AttendanceScannerController.cs    # Staff scanner APIs
│   └── AttendanceController.cs           # General attendance
├── Application/
│   ├── Services/AttendanceScannerService.cs
│   ├── Services/Interfaces/IAttendanceScannerService.cs
│   └── Contracts/Attendance/ScannerContracts.cs
├── Domain/Entities/
│   ├── Library.cs                        # AttendanceQrToken
│   └── Member.cs                         # AttendanceQrToken
└── Infrastructure/Data/Migrations/
    ├── 20260815140000_AddLibraryAttendanceQrToken.cs
    └── 20260816061655_AddMemberAttendanceQrToken.cs

SLMS_UI/src/app/
├── features/attendance/
│   ├── kiosk/                            # NEW — public kiosk module
│   │   ├── library-kiosk.component.*
│   │   └── member-kiosk.component.*
│   └── attendance-scanner/               # Staff scanner (authenticated)
├── core/services/
│   ├── attendance-kiosk.service.ts       # NEW
│   └── attendance-scanner.service.ts
└── app.routes.ts                         # /kiosk/attendance/* routes
```

---

## 6. Testing checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Open `/kiosk/attendance/library?token={valid}` | Library name + member list, no login redirect |
| 2 | Select member → Check in | Success; check-in time shown |
| 3 | Check in again same day | Check-in disabled; check-out enabled |
| 4 | Check out | Success; both actions disabled (done) |
| 5 | Auto button | Checks in if not in; checks out if checked in |
| 6 | Open `/kiosk/attendance/member?token={valid}` | Member name + actions, no login |
| 7 | Invalid token | Error message on kiosk page |
| 8 | Member details → Attendance QR | QR image loads (staff logged in) |
| 9 | Staff `/attendance/scanner` without permission | Redirect to `/unauthorized` |
| 10 | Member A marks attendance on device → Member B on same device | Error: device already used for Member A |
| 11 | Same member check-out on bound device | Allowed |
| 12 | Staff scanner multiple members | Allowed (no device lock) |

---

## 7. Related modules

| Module | Doc | Relation |
|--------|-----|----------|
| M-13 Attendance (staff) | [attendance-module-workflow.md](./attendance-module-workflow.md) | Overview, calendar, live, records, export |
| M-06 Members | [members-list-workflow.md](./members-list-workflow.md) | Member library assignment, QR token |
| M-06 Members | [members-detail-workflow.md](./members-detail-workflow.md) | Attendance tab, member QR display |
| M-06b Scoped members | [scoped-members-workflow.md](./scoped-members-workflow.md) | Members tabs on detail pages |
| Libraries list | [libraries-list-workflow.md](./libraries-list-workflow.md) | Global library portfolio |
| Library detail | [library-detail-workflow.md](./library-detail-workflow.md) | Library QR display / print |
| M-15 Administration | [administration-workflow.md](./administration-workflow.md) | `attendance.scanner.use` permission |

---

## 8. Planned enhancements

- Browser camera QR scanner (html5-qrcode / zxing)
- Library QR print from [libraries list](./libraries-list-workflow.md) (`/libraries`)
- Rate limiting on public kiosk endpoints
- Production `Attendance:*KioskUrlBase` in `appsettings.json`
