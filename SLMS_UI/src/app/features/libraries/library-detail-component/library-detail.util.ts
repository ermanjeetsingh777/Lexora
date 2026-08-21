import { format } from 'date-fns';
import type { ChartData, ChartOptions } from 'chart.js';
import type {
  DayKey,
  DaySlot,
  HoursException,
  LibraryDayHours,
  LibrarySeat,
  LibraryTrendPoint,
  LibraryDetailTab,
  SeatStatus,
  TimeFormat,
} from '@core/models/library-detail.models';

export const TABS: { id: LibraryDetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'seats', label: 'Seats' },
  { id: 'members', label: 'Members' },
  { id: 'profile', label: 'Profile' },
  { id: 'hours', label: 'Hours' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'sections', label: 'Sections' },
];

export const WEEK_DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

const OCCUPANCY_LINE = 'oklch(0.62 0.18 258)';

function occupancyAreaGradient(context: {
  chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } };
}): string | CanvasGradient {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) {
    return 'rgba(59, 130, 246, 0.15)';
  }
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
  return gradient;
}

export function fmtTime(value: string | null | undefined, format: TimeFormat): string {
  if (!value) return '—';
  if (format === '24h') return value;
  const [hStr, m = '00'] = value.split(':');
  let h = Number(hStr);
  if (Number.isNaN(h)) return value;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

export function branchDefaultHours(open: string | null | undefined, close: string | null | undefined): Record<DayKey, DaySlot> {
  const closed = !open || !close;
  const slot: DaySlot = {
    closed,
    open: closed ? null : open,
    close: closed ? null : close,
  };
  return Object.fromEntries(WEEK_DAYS.map((d) => [d.key, { ...slot }])) as Record<DayKey, DaySlot>;
}

export function slotEqual(a: DaySlot, b: DaySlot): boolean {
  if (a.closed !== b.closed) return false;
  if (a.closed) return true;
  return (a.open ?? '') === (b.open ?? '') && (a.close ?? '') === (b.close ?? '');
}

export function validateSlot(slot: DaySlot): string | null {
  if (slot.closed) return null;
  if (!slot.open || !slot.close) return 'Set both opening and closing time';
  if (slot.close <= slot.open) return 'Closing time must be after opening time';
  return null;
}

export function todayLocalDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isExceptionPastLocked(
  exception: HoursException,
  today: string = todayLocalDateString(),
): boolean {
  return exception.endDate < today;
}

export function validateException(
  exception: HoursException,
  saved: HoursException[] = [],
  today: string = todayLocalDateString(),
): string | null {
  const original = saved.find((item) => item.id === exception.id);
  if (original && isExceptionPastLocked(original, today)) {
    if (!exceptionEqual(exception, original)) {
      return 'Past exceptions cannot be modified';
    }
    return null;
  }

  if (!exception.name.trim()) return 'Name is required';
  if (!exception.startDate || !exception.endDate) return 'Start and end dates are required';
  if (exception.endDate < exception.startDate) return 'End date must be on or after start date';

  if (!original) {
    if (exception.startDate < today || exception.endDate < today) {
      return 'Dates must be today or later';
    }
  } else {
    if (exception.endDate < today) return 'End date must be today or later';
    if (exception.startDate < today && exception.startDate !== original.startDate) {
      return 'Start date cannot be set to a past date';
    }
  }

  if (!exception.closed) {
    if (!exception.open || !exception.close) return 'Set both opening and closing time, or mark as closed';
    if (exception.close <= exception.open) return 'Closing time must be after opening time';
  }
  return null;
}

export function exceptionEqual(a: HoursException, b: HoursException): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    a.closed === b.closed &&
    (a.open ?? '') === (b.open ?? '') &&
    (a.close ?? '') === (b.close ?? '')
  );
}

export function isExceptionNew(saved: HoursException[], exception: HoursException): boolean {
  return !saved.some((item) => item.id === exception.id);
}

export function isExceptionChanged(saved: HoursException[], exception: HoursException): boolean {
  const original = saved.find((item) => item.id === exception.id);
  if (!original) return true;
  if (isExceptionPastLocked(original)) return false;
  return !exceptionEqual(original, exception);
}

export function exceptionsDirty(current: HoursException[], saved: HoursException[]): boolean {
  if (current.length !== saved.length) return true;
  return current.some((exception) => isExceptionChanged(saved, exception));
}

export function summarizeExceptionChanges(current: HoursException[], saved: HoursException[]): {
  added: number;
  updated: number;
  removed: number;
} {
  const added = current.filter((exception) => isExceptionNew(saved, exception)).length;
  const removed = saved.filter(
    (exception) => !current.some((item) => item.id === exception.id) && !isExceptionPastLocked(exception),
  ).length;
  const updated = current.filter((exception) => {
    const original = saved.find((item) => item.id === exception.id);
    return original != null && !exceptionEqual(original, exception);
  }).length;

  return { added, updated, removed };
}

export function currentShift(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}

export function buildLibraryOccupancyChartData(points: LibraryTrendPoint[]): ChartData<'line'> {
  return {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Occupied seats',
        data: points.map((p) => p.value),
        fill: true,
        tension: 0.4,
        borderColor: OCCUPANCY_LINE,
        backgroundColor: occupancyAreaGradient,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: OCCUPANCY_LINE,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };
}

export function buildLibraryOccupancyChartOptions(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 8, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: { precision: 0, font: { size: 11 } },
      },
    },
  };
}

export function weeklyHoursFromApi(days: LibraryDayHours[] | undefined | null): Record<DayKey, DaySlot> {
  const defaults = branchDefaultHours(null, null);
  if (!days?.length) return defaults;

  return Object.fromEntries(
    WEEK_DAYS.map((day) => {
      const fromApi = days.find((item) => item.day === day.key);
      if (!fromApi) return [day.key, defaults[day.key]];
      return [
        day.key,
        {
          closed: fromApi.closed,
          open: fromApi.open ?? null,
          close: fromApi.close ?? null,
        },
      ];
    }),
  ) as Record<DayKey, DaySlot>;
}

export function weeklyHoursToApiPayload(hours: Record<DayKey, DaySlot>): LibraryDayHours[] {
  return WEEK_DAYS.map((day) => {
    const slot = hours[day.key];
    return {
      day: day.key,
      closed: slot.closed,
      open: slot.open,
      close: slot.close,
    };
  });
}

export function exceptionsFromApi(items: HoursException[] | undefined | null): HoursException[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    startDate: item.startDate,
    endDate: item.endDate,
    closed: item.closed,
    open: item.open,
    close: item.close,
  }));
}

export function exceptionsToApiPayload(items: HoursException[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.name.trim(),
    startDate: item.startDate,
    endDate: item.endDate,
    closed: item.closed,
    open: item.closed ? null : item.open,
    close: item.closed ? null : item.close,
  }));
}

export function layoutSeats(seats: LibrarySeat[]): LibrarySeat[] {
  const cols = 10;
  return seats.map((seat, index) => ({
    ...seat,
    row: seat.row || Math.floor(index / cols) + 1,
    col: seat.col || (index % cols) + 1,
  }));
}

export function formatActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function seatStatusClass(status: SeatStatus): string {
  switch (status) {
    case 'occupied':
      return 'lib-seat--occupied';
    case 'reserved':
      return 'lib-seat--reserved';
    case 'maintenance':
      return 'lib-seat--maintenance';
    default:
      return 'lib-seat--available';
  }
}

export function libraryStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Maintenance':
      return 'warning';
    case 'Closed':
      return 'destructive';
    default:
      return 'muted';
  }
}

export function floorUtilisation(capacity: number, occupied: number): number {
  return capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;
}

export function sectionCapacityPercent(sectionCapacity: number, libraryCapacity: number): number {
  return libraryCapacity > 0 ? Math.min(100, Math.round((sectionCapacity / libraryCapacity) * 100)) : 0;
}
