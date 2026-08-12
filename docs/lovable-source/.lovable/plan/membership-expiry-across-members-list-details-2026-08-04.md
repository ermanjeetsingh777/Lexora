# Membership expiry across Members list & details

Show each member's plan expiry, flag who is new / expiring / expired, and surface the action required.

## Expiry model (demo data)

Add a `plan_expiry` date to the demo member dataset (derived deterministically from join date + plan cycle, so some members are already expired, some expire within days, most are healthy). From it derive a single lifecycle state:

- **New** — joined within the last 14 days
- **Active** — expires in more than 7 days
- **Expiring soon** — expires within 7 days
- **Expired** — expiry date in the past
- **Grace** — expired within the last 7 days but fees are clear

Each state maps to a colour token (success / warning / destructive / info) and an "action required" label:
- Expired + fees owed → "Collect dues & renew"
- Expired → "Renew plan"
- Expiring soon → "Send renewal reminder"
- New → "Complete onboarding"
- Active → "No action"

## Members list (/members)

- New KPI tiles: "Expiring in 7 days" and "Expired", replacing/joining the current KPI strip.
- New table columns: **Expires** (date + "in 5 days" / "12 days ago") and **Action** (pill showing the required action, muted dash when none).
- Expiry badge next to the plan badge in both table rows and card view.
- New filter group in the filters popover: lifecycle (New / Active / Expiring soon / Expired), plus a one-tap "Needs action" toggle in the toolbar.
- Sortable by expiry date.
- Rows for expired members get a subtle destructive left accent so they scan instantly.
- Quick-view sheet gains Expires, Days left, and Action-required rows.

## Member details

- Hero KPI strip: replace/add an "Plan expires" stat showing the date, days left, and the lifecycle badge.
- A banner above the tabs when action is required (expired / expiring / new), with the action text and a **Renew plan** button.
- Renew is a local, persisted action (same localStorage pattern as the attendance log): it extends expiry by one cycle from today, clears the banner, and appends an activity entry.
- Insights card shows next renewal from the real expiry value rather than a random date.

## Technical notes

- Extend `src/lib/mock/members-demo.ts` with `plan_expiry` and a shared `memberLifecycle(member)` helper returning `{ state, label, tone, daysLeft, action }` so list and profile stay consistent.
- Renewal state stored in a small localStorage-backed helper (`renewals` map keyed by member id) merged on read, mirroring `src/lib/mock/attendance-log.ts`.
- UI changes only in `src/routes/_authenticated.members.index.tsx` and `src/components/person-profile.tsx`; colours use existing semantic tokens via `StatusBadge`-style variants — no hardcoded colour utilities.
