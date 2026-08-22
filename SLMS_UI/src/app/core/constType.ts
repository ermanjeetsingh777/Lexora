import { ContactRelation } from "./enums/OnbardingSteps";

export type ViewMode = 'table' | 'grid';
export type Shift = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full' |'General';
export type MemberPlanType = string;

export const DEFAULT_MEMBER_PLAN_NAMES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'] as const;

export const PLAN_CLASSES: Record<string, string> = {
  Monthly: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  Quarterly: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  Yearly: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  'Half Yearly': 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  'No plan': 'bg-muted text-muted-foreground border-border',
};

export const PAY_STATUS_CLASSES: Record<string, string> = {
  Paid: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  Pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  Failed: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
  Refunded: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
};

export const EVENT_DOT: Record<string, string> = {
  payment: 'bg-emerald-500',
  attendance: 'bg-blue-500',
  plan: 'bg-violet-500',
  seat: 'bg-amber-500',
  note: 'bg-slate-500',
};

export const relationOptions = [
  { label: 'Father', value: ContactRelation.Father },
  { label: 'Mother', value: ContactRelation.Mother },
  { label: 'Brother', value: ContactRelation.Brother },
  { label: 'Sister', value: ContactRelation.Sister },
  { label: 'Spouse', value: ContactRelation.Spouse },
  { label: 'Friend', value: ContactRelation.Friend },
  { label: 'Guardian', value: ContactRelation.Guardian },
  { label: 'Other', value: ContactRelation.Other }
];
