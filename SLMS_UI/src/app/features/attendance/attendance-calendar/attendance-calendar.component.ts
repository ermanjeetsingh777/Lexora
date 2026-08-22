import { NgStyle } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  LucideCalendarCheck,
  LucideCalendarDays,
  LucideCalendarRange,
  LucideChevronLeft,
  LucideChevronRight,
  LucideFilter,
  LucideLogIn,
  LucideLogOut,
  LucideX,
} from '@lucide/angular';
import {
  AttendanceCalendarMonth,
  AttendanceCalendarShiftSummary,
  AttendanceCalendarSummary,
} from '@core/models/attendanceModels';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { AttendanceFilterService } from '../attendance-filter.service';
import {
  ATTENDANCE_SHIFTS,
  AttendanceShift,
  CalendarGridCell,
  CalendarSelectionMode,
  CalendarStatusFilter,
  buildCalendarGridCells,
  eachDay,
  formatLongWeekdayDate,
  formatShortDate,
  formatWeekdayDate,
  inDateRange,
  intensityBackground,
  sameDay,
  toIsoDate,
} from './attendance-calendar.util';

@Component({
  selector: 'app-attendance-calendar',
  standalone: true,
  imports: [
    NgStyle,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    KpiCardComponent,
    StatusBadgeComponent,
    LucideCalendarCheck,
    LucideCalendarDays,
    LucideCalendarRange,
    LucideChevronLeft,
    LucideChevronRight,
    LucideFilter,
    LucideLogIn,
    LucideLogOut,
    LucideX,
  ],
  templateUrl: './attendance-calendar.component.html',
  styleUrl: './attendance-calendar.component.css',
})
export class AttendanceCalendarComponent {
  private readonly moduleService = inject(AttendanceModuleService);
  private readonly filters = inject(AttendanceFilterService);
  private readonly toast = inject(ToastService);

  readonly today = new Date();
  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly shiftOptions = ATTENDANCE_SHIFTS;
  readonly intensityLegend = [15, 40, 65, 90];
  readonly formatShortDate = formatShortDate;
  readonly formatWeekdayDate = formatWeekdayDate;

  readonly loadingMonth = signal(true);
  readonly loadingSummary = signal(true);
  readonly monthData = signal<AttendanceCalendarMonth | null>(null);
  readonly summary = signal<AttendanceCalendarSummary | null>(null);

  readonly mode = signal<CalendarSelectionMode>('single');
  readonly statusFilter = signal<CalendarStatusFilter>('all');
  readonly selectedShifts = signal<AttendanceShift[]>([...ATTENDANCE_SHIFTS]);
  readonly selected = signal<Date>(this.today);
  readonly rangeStart = signal<Date | null>(this.today);
  readonly rangeEnd = signal<Date | null>(this.today);
  readonly yearMonth = signal({ year: this.today.getFullYear(), month: this.today.getMonth() + 1 });

  readonly dayMap = computed(() => {
    const map = new Map<string, AttendanceCalendarMonth['days'][number]>();
    for (const day of this.monthData()?.days ?? []) {
      map.set(day.date, day);
    }
    return map;
  });

  readonly gridCells = computed<CalendarGridCell[]>(() => {
    const ym = this.yearMonth();
    return buildCalendarGridCells(ym.year, ym.month, this.dayMap());
  });

  readonly selectedDays = computed(() => {
    if (this.mode() === 'single') {
      return [this.selected()];
    }
    const start = this.rangeStart();
    const end = this.rangeEnd();
    if (start && end) return eachDay(start, end);
    if (start) return [start];
    return [];
  });

  readonly visibleShiftRows = computed(() => {
    const selected = this.selectedShifts();
    return (this.summary()?.byShift ?? []).filter((row) => selected.includes(row.shift as AttendanceShift));
  });

  readonly filteredTotals = computed(() => {
    return this.visibleShiftRows().reduce(
      (acc, row) => ({
        assigned: acc.assigned + row.assigned,
        checkIns: acc.checkIns + row.checkIns,
        checkOuts: acc.checkOuts + row.checkOuts,
        late: acc.late + row.late,
        absent: acc.absent + row.absent,
      }),
      { assigned: 0, checkIns: 0, checkOuts: 0, late: 0, absent: 0 },
    );
  });

  readonly headerLabel = computed(() => {
    const days = this.selectedDays();
    if (this.mode() === 'single') {
      const selected = this.selected();
      const prefix = sameDay(selected, this.today) ? 'Today · ' : '';
      return prefix + formatLongWeekdayDate(selected);
    }
    const start = this.rangeStart();
    const end = this.rangeEnd();
    if (start && end) {
      return `${formatShortDate(start)} → ${formatShortDate(end)} · ${days.length} day${days.length === 1 ? '' : 's'}`;
    }
    if (start) {
      return `${formatShortDate(start)} · pick end date`;
    }
    return 'Pick a start date';
  });

  readonly monthTitle = computed(() => {
    const ym = this.yearMonth();
    return new Date(ym.year, ym.month - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
  });

  readonly avgPerDay = computed(() => {
    const days = this.selectedDays();
    const totals = this.filteredTotals();
    if (days.length <= 1) return null;
    return {
      checkIns: Math.round(totals.checkIns / days.length),
      assigned: Math.round(totals.assigned / days.length),
    };
  });

  readonly primaryKpi = computed(() => {
    const totals = this.filteredTotals();
    const filter = this.statusFilter();
    if (filter === 'late') {
      return { label: 'Late arrivals', value: totals.late };
    }
    if (filter === 'absent') {
      return { label: 'Absent', value: totals.absent };
    }
    return { label: 'Check-ins', value: totals.checkIns };
  });

  constructor() {
    effect(() => {
      this.filters.libraryId();
      this.filters.librariesLoaded();
      this.yearMonth();
      this.loadMonth();
    });

    effect(() => {
      this.filters.libraryId();
      this.filters.librariesLoaded();
      this.mode();
      this.selected();
      this.rangeStart();
      this.rangeEnd();
      this.loadSummary();
    });
  }

  intensityStyle(value: number): Record<string, string> {
    return { background: intensityBackground(value) };
  }

  isToday(date: Date | null): boolean {
    return sameDay(date, this.today);
  }

  isSelected(date: Date | null): boolean {
    return this.mode() === 'single' && sameDay(date, this.selected());
  }

  isInRange(date: Date | null): boolean {
    if (this.mode() !== 'range') return false;
    return inDateRange(date, this.rangeStart(), this.rangeEnd());
  }

  isRangeEdge(date: Date | null): boolean {
    if (this.mode() !== 'range' || !date) return false;
    return sameDay(date, this.rangeStart()) || sameDay(date, this.rangeEnd());
  }

  isRangeStart(date: Date | null): boolean {
    return this.mode() === 'range' && sameDay(date, this.rangeStart());
  }

  isRangeEnd(date: Date | null): boolean {
    return this.mode() === 'range' && sameDay(date, this.rangeEnd());
  }

  setMode(mode: CalendarSelectionMode): void {
    this.mode.set(mode);
    if (mode === 'range') {
      this.rangeStart.set(this.selected());
      this.rangeEnd.set(this.selected());
    }
  }

  toggleShift(shift: AttendanceShift): void {
    const current = this.selectedShifts();
    if (current.includes(shift)) {
      const next = current.filter((item) => item !== shift);
      this.selectedShifts.set(next.length ? next : [...ATTENDANCE_SHIFTS]);
      return;
    }
    this.selectedShifts.set([...current, shift]);
  }

  isShiftSelected(shift: AttendanceShift): boolean {
    return this.selectedShifts().includes(shift);
  }

  setStatusFilter(filter: CalendarStatusFilter): void {
    this.statusFilter.set(filter);
  }

  prevMonth(): void {
    const current = this.yearMonth();
    if (current.month === 1) {
      this.yearMonth.set({ year: current.year - 1, month: 12 });
      return;
    }
    this.yearMonth.set({ year: current.year, month: current.month - 1 });
  }

  nextMonth(): void {
    const current = this.yearMonth();
    if (current.month === 12) {
      this.yearMonth.set({ year: current.year + 1, month: 1 });
      return;
    }
    this.yearMonth.set({ year: current.year, month: current.month + 1 });
  }

  goToToday(): void {
    this.yearMonth.set({ year: this.today.getFullYear(), month: this.today.getMonth() + 1 });
    this.selected.set(this.today);
    if (this.mode() === 'range') {
      this.rangeStart.set(this.today);
      this.rangeEnd.set(this.today);
    }
  }

  clearRange(): void {
    this.rangeStart.set(null);
    this.rangeEnd.set(null);
  }

  onSelectDate(date: Date | null): void {
    if (!date) return;

    this.yearMonth.set({ year: date.getFullYear(), month: date.getMonth() + 1 });

    if (this.mode() === 'single') {
      this.selected.set(date);
      return;
    }

    const start = this.rangeStart();
    const end = this.rangeEnd();
    if (!start || (start && end)) {
      this.rangeStart.set(date);
      this.rangeEnd.set(null);
      return;
    }
    this.rangeEnd.set(date);
  }

  shiftAttendancePercent(row: AttendanceCalendarShiftSummary): number {
    return row.assigned === 0 ? 0 : Math.round((row.checkIns / row.assigned) * 100);
  }

  private loadMonth(): void {
    this.loadingMonth.set(true);
    const ym = this.yearMonth();
    const libraryId = this.filters.libraryId() || undefined;

    this.moduleService.getCalendarMonth(ym.year, ym.month, libraryId).subscribe({
      next: (data) => {
        this.monthData.set(data);
        this.loadingMonth.set(false);
      },
      error: (err) => {
        this.loadingMonth.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to load calendar month.');
      },
    });
  }

  private loadSummary(): void {
    const days = this.selectedDays();
    if (days.length === 0) {
      this.summary.set(null);
      this.loadingSummary.set(false);
      return;
    }

    this.loadingSummary.set(true);
    const sorted = [...days].sort((a, b) => a.getTime() - b.getTime());
    const dateFrom = toIsoDate(sorted[0]);
    const dateTo = toIsoDate(sorted[sorted.length - 1]);
    const libraryId = this.filters.libraryId() || undefined;

    this.moduleService.getCalendarSummary(dateFrom, dateTo, libraryId).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loadingSummary.set(false);
      },
      error: (err) => {
        this.loadingSummary.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to load calendar summary.');
      },
    });
  }
}
