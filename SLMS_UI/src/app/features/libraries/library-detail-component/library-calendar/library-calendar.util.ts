import { format, parseISO } from 'date-fns';
import type { LibraryCalendarDay, LibraryCalendarDayStatus } from '@core/models/library-calendar.models';
import { WEEK_DAYS } from '../library-detail.util';

export const CALENDAR_STATUS_COLORS: Record<LibraryCalendarDayStatus, { primary: string; secondary: string }> = {
  open: { primary: '#10b981', secondary: '#d1fae5' },
  closed: { primary: '#94a3b8', secondary: '#e2e8f0' },
  holiday: { primary: '#f59e0b', secondary: '#fef3c7' },
  exception: { primary: '#6366f1', secondary: '#e0e7ff' },
};

export function calendarStatusLabel(status: LibraryCalendarDayStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'closed':
      return 'Closed';
    case 'holiday':
      return 'Holiday';
    case 'exception':
      return 'Special hours';
    default:
      return status;
  }
}

export function calendarDayLabel(day: LibraryCalendarDay): string {
  if (day.label) return day.label;
  return calendarStatusLabel(day.status);
}

export function calendarHoursLabel(day: LibraryCalendarDay): string {
  if (day.closed || !day.open || !day.close) return 'Closed';
  return `${day.open}–${day.close}`;
}

export function calendarDayTooltip(day: LibraryCalendarDay): string {
  const weekday = WEEK_DAYS.find((item) => item.key === day.day)?.label ?? day.day;
  const dateLabel = format(parseISO(day.date), 'EEE, MMM d, yyyy');
  const hours = calendarHoursLabel(day);
  const source = day.isException ? 'Holiday / exception' : 'Weekly schedule';
  return `${dateLabel} (${weekday})\n${calendarDayLabel(day)}\n${hours}\nSource: ${source}`;
}

export function calendarStatusClass(status: LibraryCalendarDayStatus): string {
  return `lib-cal-day lib-cal-day--${status}`;
}

export function calendarStatusBadgeClass(status: LibraryCalendarDayStatus): string {
  return `lib-cal-status lib-cal-status--${status}`;
}
