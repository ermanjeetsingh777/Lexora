import { AttendanceCalendarDayCell } from '@core/models/attendanceModels';

export type CalendarSelectionMode = 'single' | 'range';
export type CalendarStatusFilter = 'all' | 'late' | 'absent';
export type AttendanceShift = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export const ATTENDANCE_SHIFTS: AttendanceShift[] = ['Morning', 'Afternoon', 'Evening', 'Night'];

export interface CalendarGridCell {
  date: Date | null;
  intensityPercent: number;
  present: number;
  late: number;
  absent: number;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function eachDay(start: Date, end: Date): Date[] {
  const lo = Math.min(startOfDay(start), startOfDay(end));
  const hi = Math.max(startOfDay(start), startOfDay(end));
  const out: Date[] = [];
  for (let t = lo; t <= hi; t += 86_400_000) {
    out.push(new Date(t));
  }
  return out;
}

export function inDateRange(date: Date | null, rangeStart: Date | null, rangeEnd: Date | null): boolean {
  if (!date || !rangeStart) return false;
  const value = startOfDay(date);
  const start = startOfDay(rangeStart);
  const end = rangeEnd ? startOfDay(rangeEnd) : start;
  return value >= Math.min(start, end) && value <= Math.max(start, end);
}

export function buildCalendarGridCells(
  year: number,
  month: number,
  dayMap: Map<string, AttendanceCalendarDayCell>,
): CalendarGridCell[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: CalendarGridCell[] = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, intensityPercent: 0, present: 0, late: 0, absent: 0 });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const key = toIsoDate(date);
    const stats = dayMap.get(key);
    cells.push({
      date,
      intensityPercent: stats?.intensityPercent ?? 0,
      present: stats?.present ?? 0,
      late: stats?.late ?? 0,
      absent: stats?.absent ?? 0,
    });
  }

  return cells;
}

export function intensityBackground(value: number): string {
  const opacity = Math.max(0.05, value / 100);
  return `oklch(0.55 0.18 258 / ${opacity})`;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function formatWeekdayDate(date: Date): string {
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatLongWeekdayDate(date: Date): string {
  return date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}
