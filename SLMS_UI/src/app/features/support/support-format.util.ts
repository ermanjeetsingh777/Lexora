import { TicketPriority, TicketStatus } from '@core/models/support.models';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatRelative(value?: string | number | Date | null): string {
  if (value == null || value === '') return '—';
  const date = typeof value === 'number' ? new Date(value) : typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, 'day');
  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, 'hour');
  const diffMins = Math.round(diffMs / 60_000);
  return rtf.format(diffMins, 'minute');
}

import { formatAppDateTime } from '@core/utils/date-format.util';

export function formatSupportDate(value?: string | Date | null): string {
  return formatAppDateTime(value);
}

export function supportInitials(name?: string | null): string {
  const value = name?.trim();
  if (!value) return '?';
  return value.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export function priorityTone(priority: TicketPriority): string {
  if (priority === TicketPriority.Urgent || priority === TicketPriority.High) return 'destructive';
  if (priority === TicketPriority.Normal) return 'warning';
  return 'muted';
}

export function statusIconClass(status: TicketStatus): string {
  if (status === TicketStatus.Open) return 'text-destructive';
  if (status === TicketStatus.InProgress || status === TicketStatus.Waiting) return 'text-amber-500';
  return 'text-emerald-500';
}

export function slaState(ticket: { status: TicketStatus; slaDueAtUtc?: string | null }): { label: string; tone: string } {
  if (ticket.status === TicketStatus.Resolved) {
    return { label: 'SLA met', tone: 'text-emerald-500' };
  }
  if (!ticket.slaDueAtUtc) {
    return { label: 'SLA pending', tone: 'text-muted-foreground' };
  }
  const due = new Date(ticket.slaDueAtUtc).getTime();
  if (due < Date.now()) {
    return { label: `SLA breached ${formatRelative(ticket.slaDueAtUtc)}`, tone: 'text-destructive' };
  }
  return { label: `SLA due ${formatRelative(ticket.slaDueAtUtc)}`, tone: 'text-amber-500' };
}
