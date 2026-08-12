# Members enhancements plan

Scope: `/members` list + member detail page for `demo_mem_*` IDs. Frontend only, using existing demo dataset (`src/lib/mock/members-demo.ts`). No schema or server-fn changes.

## 1. Members list (`src/routes/_authenticated.members.index.tsx`)

**Quick row actions** (extend existing Actions dropdown + add inline icon buttons in the row):
- Copy ID button → `navigator.clipboard.writeText(m.id)` + toast "Member ID copied".
- Open detail drawer button → opens a new `MemberQuickDrawer` (Sheet) showing a compact summary (avatar, contact, plan, attendance, fees, last visit) with a "Open full profile" link to `/members/$memberId`. This is in addition to the existing full-page route.

**FilterBar upgrade**:
- Replace single-select status/plan button rows with a shared `FilterBar` block containing:
  - Search input (name/email/phone) — already exists, keep.
  - Multi-select **Status** (Active, Inactive, Suspended) via popover + checkboxes.
  - Multi-select **Plan** (Basic, Plus, Pro, Annual).
  - Multi-select **Premium tier** (derived: Basic/Plus = Standard, Pro = Premium, Annual = Elite) — checkbox popover.
  - "Clear all" chip when any filter active; active filter chips row under the bar.
- **Persistence**: store `{q, statuses[], plans[], tiers[], view}` in `localStorage` under `members:filters:v1`, hydrate on mount, write on change. (URL search params optional; keep localStorage to avoid route schema churn.)

## 2. Member detail page (demo IDs only) — `src/components/person-profile.tsx`

For `id.startsWith("demo_mem_")` render an enriched layout using demo data. Non-demo members keep current layout.

**New demo generator** in `src/lib/mock/members-demo.ts`:
- `getDemoMemberAttendance(id)` → deterministic 90-day array of `{date, status: present|absent|late|holiday, hours}`.
- `getDemoMemberPayments(id)` → 8–12 invoice-like records `{id, date, amount, method, status}`.
- `getDemoMemberActivity(id)` → 10–15 timeline events (payment, seat change, plan change, attendance streak, note).
- `getDemoMemberGuardian(id)` → `{name, relation, phone, email, address, emergency: {name, phone, relation}}`.

**Overview tab additions**:
- **Guardian & emergency contact card** (GlassCard) — 2-column: guardian info + emergency contact info with call/email links.
- Existing activity timeline replaced with real vertical timeline of `getDemoMemberActivity` events.

**Attendance tab**:
- **Month AttendanceCalendar**: reuse `src/components/attendance-calendar.tsx` if compatible, else render a lightweight month grid (Sun–Sat header, 6 rows). Prev/next month controls, color-coded day cells (present/absent/late/holiday) with hover tooltip showing hours.
- **90-day heatmap**: GitHub-style grid (13 cols × 7 rows) with intensity based on hours, legend below.
- KPI row: Present days, Absent days, Attendance %, Longest streak.

**Payments tab**:
- Summary strip: Total paid, Outstanding, Last payment date.
- Table of payments (Date, Invoice #, Amount, Method, Status badge, Download stub).

**History tab**: keep existing note; timeline lives on Overview.

## 3. Files touched

- `src/routes/_authenticated.members.index.tsx` — filter bar, persistence, row quick actions, quick drawer.
- `src/lib/mock/members-demo.ts` — add attendance/payments/activity/guardian generators.
- `src/components/person-profile.tsx` — demo-branch enriched tabs (Overview/Attendance/Payments) with calendar, heatmap, guardian card.
- New small components inline in `person-profile.tsx` (MonthCalendar, HeatmapGrid, TimelineList, GuardianCard) — no new files unless size demands.

## Out of scope

- No backend changes, no real payments/attendance wiring, no changes to non-demo profile layout beyond the guardian card only rendering for demo IDs.
- Bulk actions and export beyond the existing Export button.
