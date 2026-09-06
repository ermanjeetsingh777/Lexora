export type LifecycleTone = 'success' | 'warning' | 'destructive' | 'info' | 'muted';

export type LifecycleState = 'New' | 'Active' | 'Expiring soon' | 'Grace' | 'Expired' | 'No plan';

export interface MemberLifecycle {
  state: LifecycleState;
  tone: LifecycleTone;
  daysLeft: number;
  expiry: string;
  relative: string;
  action: string | null;
  needsAction: boolean;
}

export interface RenewTarget {
  id: string;
  name: string;
  plan: string;
  planId: string;
  expiry: string;
  daysLeft: number;
  feesOwed: number;
  planDurationInDays: number;
  hasPlan: boolean;
  selectedPlanId?: string;
  /** Editable renewal window (ISO yyyy-mm-dd). */
  startDate?: string;
  endDate?: string;
  /** Custom amount actually paid on renew/assign. */
  paidAmount?: number;
  /** Manual due on renew/assign. Shortfall without due = Adjustment. */
  dueAmount?: number;
  planPrice?: number;
}

/** Add calendar days to an ISO date (yyyy-mm-dd). */
export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const LIFECYCLE_OPTS: LifecycleState[] = ['New', 'Active', 'Expiring soon', 'Grace', 'Expired', 'No plan'];

export const LIFECYCLE_TONE_CLASSES: Record<LifecycleTone, string> = {
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/15 text-warning-foreground border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/25',
  info: 'bg-info/10 text-info border-info/25',
  muted: 'bg-muted text-muted-foreground border-border',
};

export const MEMBERS_FILTER_STORAGE_KEY = 'members:filters:v3';

function dayDiff(iso: string | Date | null | undefined): number {
  if (!iso) return 0;
  const target = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatExpiry(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0, 10);
}

/** BR-06.1 / BR-06.2 — lifecycle derived from dates and fees, never stored. */
export function computeMemberLifecycle(input: {
  planEndDate?: string | Date | null;
  joinDate?: string | Date | null;
  feesOwed?: number;
}): MemberLifecycle {
  const expiry = input.planEndDate ?? null;
  const hasPlan = !!expiry;
  const daysLeft = hasPlan ? dayDiff(expiry) : 0;
  const joinedDaysAgo = input.joinDate
    ? Math.max(0, Math.floor((Date.now() - new Date(input.joinDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 999;
  const fees = input.feesOwed ?? 0;

  let state: LifecycleState;
  let tone: LifecycleTone;

  if (!hasPlan) {
    state = 'No plan';
    tone = 'warning';
  } else if (daysLeft < 0 && daysLeft >= -7 && fees === 0) {
    state = 'Grace';
    tone = 'warning';
  } else if (daysLeft < 0) {
    state = 'Expired';
    tone = 'destructive';
  } else if (joinedDaysAgo <= 14) {
    state = 'New';
    tone = 'info';
  } else if (daysLeft <= 7) {
    state = 'Expiring soon';
    tone = 'warning';
  } else {
    state = 'Active';
    tone = 'success';
  }

  const action = !hasPlan
    ? 'Purchase plan'
    : state === 'Expired' && fees > 0
      ? 'Collect dues & renew'
      : state === 'Expired'
        ? 'Renew plan'
        : state === 'Grace'
          ? 'Renew within grace'
          : state === 'Expiring soon'
            ? 'Send renewal reminder'
            : state === 'New'
              ? 'Complete onboarding'
              : null;

  const relative = !hasPlan
    ? '—'
    : daysLeft === 0
      ? 'today'
      : daysLeft > 0
        ? `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
        : `${Math.abs(daysLeft)} day${daysLeft === -1 ? '' : 's'} ago`;

  return {
    state,
    tone,
    daysLeft,
    expiry: formatExpiry(expiry),
    relative,
    action,
    needsAction: action !== null,
  };
}

/** Preview new expiry from start + plan duration. */
export function previewRenewal(durationInDays: number, startIso?: string): { date: string; label: string; start: string } {
  const days = durationInDays > 0 ? durationInDays : 30;
  const start = startIso?.slice(0, 10) || todayIsoLocal();
  const date = addDaysIso(start, days);
  const label = days >= 365 ? '+12 months' : days >= 90 ? `+${Math.round(days / 30)} months` : `+${days} days`;
  return { date, label, start };
}

export function formatRenewDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function lifecycleBannerClass(tone: LifecycleTone): string {
  if (tone === 'destructive') return 'border-destructive/30 bg-destructive/10 text-destructive';
  if (tone === 'warning') return 'border-warning/30 bg-warning/10 text-warning-foreground';
  if (tone === 'info') return 'border-info/30 bg-info/10 text-info';
  return 'border-success/30 bg-success/10 text-success';
}

export function lifecycleRowClass(state: LifecycleState): string {
  if (state === 'Expired') return 'bg-destructive/[0.04] border-l-2 border-l-destructive';
  if (state === 'Expiring soon' || state === 'Grace') return 'border-l-2 border-l-warning';
  if (state === 'New') return 'border-l-2 border-l-info';
  return '';
}

export function lifecycleRelativeClass(daysLeft: number): string {
  if (daysLeft < 0) return 'text-destructive';
  if (daysLeft <= 7) return 'text-warning-foreground';
  return 'text-muted-foreground';
}

export function renewTargetFromListMember(m: {
  id: string;
  name: string;
  userName?: string;
  email?: string;
  plan?: string;
  planId?: string;
  planEndDate?: string | Date | null;
  feesOwed?: number;
  planDurationInDays?: number;
  planPrice?: number;
  paidAmount?: number;
  dueAmount?: number;
  life: MemberLifecycle;
}): RenewTarget {
  const hasPlan = !!m.planEndDate;
  return {
    id: m.id,
    name: m.name || m.userName || m.email || 'Member',
    plan: m.plan ?? 'Plan',
    planId: m.planId ?? '',
    expiry: m.life.expiry,
    daysLeft: m.life.daysLeft,
    feesOwed: m.feesOwed ?? 0,
    planDurationInDays: m.planDurationInDays ?? 30,
    hasPlan,
    planPrice: m.planPrice ?? 0,
    paidAmount: m.paidAmount ?? m.planPrice ?? 0,
    dueAmount: m.dueAmount ?? m.feesOwed ?? 0,
  };
}
