import { NgClass } from '@angular/common';
import {
  Component, computed, effect, input, output, signal, TemplateRef, viewChild,
} from '@angular/core';
import {
  addDays, endOfWeek, format, isAfter, isSameDay, isWeekend, parseISO, startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import {
  CalendarDatePipe,
  CalendarEvent,
  CalendarMonthViewComponent,
  CalendarNextViewDirective,
  CalendarPreviousViewDirective,
  CalendarTooltipDirective,
  CalendarView,
  CalendarWeekViewComponent,
  DateAdapter,
  provideCalendar,
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { AttendanceResponse, AttendanceStatus } from '@core/models/attendanceModels';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SectionHeaderComponent } from '@shared/components/page-header/page-header.component';

type CalendarViewMode = CalendarView | 'year';
type AttendanceDayStatus = 'present' | 'late' | 'absent' | 'checkedIn' | 'holiday' | 'none' | 'future';

const STATUS_COLORS: Record<string, { primary: string; secondary: string }> = {
  checkedIn: { primary: '#3b82f6', secondary: '#dbeafe' },
  present: { primary: '#10b981', secondary: '#d1fae5' },
  late: { primary: '#f59e0b', secondary: '#fef3c7' },
  absent: { primary: '#f43f5e', secondary: '#ffe4e6' },
  holiday: { primary: '#94a3b8', secondary: '#e2e8f0' },
};

@Component({
  selector: 'app-member-attendance-calendar',
  imports: [
    NgClass,
    ButtonComponent,
    SectionHeaderComponent,
    CalendarMonthViewComponent,
    CalendarWeekViewComponent,
    CalendarPreviousViewDirective,
    CalendarNextViewDirective,
    CalendarTooltipDirective,
    CalendarDatePipe,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  templateUrl: './member-attendance-calendar.component.html',
  styleUrl: './member-attendance-calendar.component.css',
  providers: [
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
})
export class MemberAttendanceCalendarComponent {
  readonly CalendarView = CalendarView;

  readonly records = input<AttendanceResponse[]>([]);
  readonly loading = input(false);
  readonly viewDate = input(new Date());

  readonly viewDateChange = output<Date>();

  readonly view = signal<CalendarViewMode>(CalendarView.Month);
  readonly internalViewDate = signal(new Date());

  readonly cellTemplateRef = viewChild<TemplateRef<unknown>>('attendanceCellTpl');
  readonly monthHeaderTemplateRef = viewChild<TemplateRef<unknown>>('monthHeaderTpl');
  readonly weekEventTemplateRef = viewChild<TemplateRef<unknown>>('weekEventTpl');
  readonly weekHeaderTemplateRef = viewChild<TemplateRef<unknown>>('weekHeaderTpl');
  readonly weekHourSegmentTemplateRef = viewChild<TemplateRef<unknown>>('weekHourSegmentTpl');

  readonly weekDayStartHour = 6;
  readonly weekDayEndHour = 22;
  readonly weekHourSegments = 1;
  readonly weekHourDuration = 60;
  readonly weekHourSegmentHeight = 30;
  readonly weekWeekendDays = [0, 6];

  private readonly today = startOfDay(new Date());

  readonly attendanceByDate = computed(() => {
    const map = new Map<string, AttendanceResponse>();
    for (const record of this.records()) {
      const key = this.normalizeDate(record.attendanceDate);
      if (key) map.set(key, record);
    }
    return map;
  });

  readonly viewTitle = computed(() => {
    const date = this.internalViewDate();
    if (this.view() === 'year') return String(date.getFullYear());
    if (this.view() === CalendarView.Week) {
      const start = startOfWeek(date, { weekStartsOn: 0 });
      const end = endOfWeek(date, { weekStartsOn: 0 });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
      }
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return format(date, 'MMMM yyyy');
  });

  readonly calendarEvents = computed<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    for (const record of this.records()) {
      const dayDate = this.parseAttendanceDate(record.attendanceDate);
      if (isAfter(startOfDay(dayDate), this.today)) continue;

      const status = this.toDayStatus(record.status, dayDate);
      if (status === 'future' || status === 'none') continue;

      events.push({
        start: dayDate,
        end: dayDate,
        title: this.statusLabel(record.status),
        allDay: true,
        color: STATUS_COLORS[status === 'checkedIn' ? 'checkedIn' : status] ?? STATUS_COLORS['present'],
        meta: { record, status },
      });
    }
    return events;
  });

  readonly weekTimesheetEvents = computed<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    const weekStart = startOfWeek(this.internalViewDate(), { weekStartsOn: 0 });

    for (let offset = 0; offset < 7; offset++) {
      const dayDate = addDays(weekStart, offset);
      if (isAfter(startOfDay(dayDate), this.today)) continue;

      const key = format(dayDate, 'yyyy-MM-dd');
      const record = this.attendanceByDate().get(key);
      const weekend = isWeekend(dayDate);

      if (!record) {
        if (!weekend) {
          events.push(this.allDayStatusEvent(dayDate, 'absent', 'Absent', 'absent'));
        }
        continue;
      }

      const status = this.toDayStatus(record.status, dayDate);
      const statusKey = status === 'checkedIn' ? 'checkedIn' : status === 'late' ? 'late' : status === 'absent' ? 'absent' : status === 'holiday' ? 'holiday' : 'present';

      if (status === 'holiday' || weekend) {
        events.push(this.allDayStatusEvent(dayDate, statusKey, this.statusLabel(record.status), 'holiday'));
        continue;
      }

      if (status === 'absent') {
        events.push(this.allDayStatusEvent(dayDate, 'absent', this.statusLabel(record.status), 'absent'));
        continue;
      }

      const checkIn = this.combineAttendanceDateTime(dayDate, this.checkInValue(record));
      const hasSession = !!checkIn;

      events.push(this.allDayStatusEvent(
        dayDate,
        statusKey,
        this.statusLabel(record.status),
        'status',
        record,
        status,
      ));

      if (hasSession && checkIn) {
        const end = this.sessionEndTime(dayDate, checkIn, record, status);
        const checkOutLabel = record.checkOutTime || record.checkOutAtUtc
          ? this.formatTime(record.checkOutTime ?? record.checkOutAtUtc)
          : status === 'checkedIn' ? 'In session' : '—';
        const durationMinutes = this.sessionDurationMinutes(record, dayDate);

        events.push({
          start: checkIn,
          end,
          title: this.statusLabel(record.status),
          color: STATUS_COLORS[status === 'checkedIn' ? 'checkedIn' : status === 'late' ? 'late' : 'present'],
          meta: {
            record,
            status,
            statusLabel: this.statusLabel(record.status),
            kind: 'session',
            timeRange: `${this.formatTime(checkIn)} – ${checkOutLabel}`,
            durationMinutes,
            tooltip: this.buildTooltip(record, dayDate),
          },
        });
      }
    }

    return events;
  });

  readonly yearMonths = computed(() => {
    const year = this.internalViewDate().getFullYear();
    const months: { index: number; label: string; present: number; late: number; absent: number }[] = [];

    for (let month = 0; month < 12; month++) {
      let present = 0;
      let late = 0;
      let absent = 0;

      for (const record of this.records()) {
        const dayDate = this.parseAttendanceDate(record.attendanceDate);
        if (dayDate.getFullYear() !== year || dayDate.getMonth() !== month) continue;
        if (isAfter(startOfDay(dayDate), this.today)) continue;

        const status = this.toDayStatus(record.status, dayDate);
        if (status === 'present' || status === 'checkedIn') present++;
        else if (status === 'late') late++;
        else if (status === 'absent') absent++;
      }

      months.push({ index: month, label: format(new Date(year, month, 1), 'MMMM'), present, late, absent });
    }

    return months;
  });

  constructor() {
    effect(() => {
      const incoming = this.viewDate();
      this.internalViewDate.set(new Date(incoming));
    });
  }

  setView(next: CalendarViewMode): void {
    this.view.set(next);
  }

  onViewDateChanged(date: Date): void {
    this.internalViewDate.set(date);
    this.viewDateChange.emit(date);
  }

  goToday(): void {
    const today = new Date();
    this.onViewDateChanged(this.view() === CalendarView.Month ? startOfMonth(today) : today);
  }

  selectYearMonth(monthIndex: number): void {
    const next = new Date(this.internalViewDate().getFullYear(), monthIndex, 1);
    this.viewDateChange.emit(next);
    this.view.set(CalendarView.Month);
    this.internalViewDate.set(next);
  }

  prevYear(): void {
    this.onViewDateChanged(new Date(this.internalViewDate().getFullYear() - 1, 0, 1));
  }

  nextYear(): void {
    this.onViewDateChanged(new Date(this.internalViewDate().getFullYear() + 1, 0, 1));
  }

  calendarNavView(): CalendarView {
    return this.view() === 'year' ? CalendarView.Month : this.view() as CalendarView;
  }

  cellClass(day: { date: Date }): string {
    if (isAfter(startOfDay(day.date), this.today)) {
      return 'attendance-day attendance-day--future';
    }

    const record = this.attendanceByDate().get(format(day.date, 'yyyy-MM-dd'));
    if (!record) {
      return isWeekend(day.date)
        ? 'attendance-day attendance-day--holiday'
        : 'attendance-day attendance-day--empty';
    }

    const status = this.toDayStatus(record.status, day.date);
    return `attendance-day attendance-day--${status}`;
  }

  tooltipFor(day: { date: Date }): string {
    const record = this.attendanceByDate().get(format(day.date, 'yyyy-MM-dd'));
    if (!record) {
      return isWeekend(day.date) ? 'Weekend' : 'No attendance record';
    }
    return this.buildTooltip(record, day.date);
  }

  isFutureDay(day: { date: Date }): boolean {
    return isAfter(startOfDay(day.date), this.today);
  }

  hoursFor(day: { date: Date }): string | null {
    const record = this.attendanceByDate().get(format(day.date, 'yyyy-MM-dd'));
    if (!record) return null;
    const minutes = this.sessionDurationMinutes(record, day.date);
    return minutes != null ? this.formatDuration(minutes) : null;
  }

  weekEventClass(event: CalendarEvent): string {
    const status = event.meta?.['status'] as AttendanceDayStatus | undefined;
    const kind = event.meta?.['kind'] as string | undefined;
    if (kind === 'holiday') return 'timesheet-event-wrap timesheet-event--holiday';
    if (kind === 'absent') return 'timesheet-event-wrap timesheet-event--absent';
    if (kind === 'status') return `timesheet-event-wrap timesheet-event--${status ?? 'present'}`;
    return `timesheet-event-wrap timesheet-event-wrap--timed timesheet-event--${status ?? 'present'}`;
  }

  isWeekStatusBadge(event: CalendarEvent): boolean {
    const kind = event.meta?.['kind'] as string | undefined;
    return kind === 'status' || kind === 'absent' || kind === 'holiday' || !!event.allDay;
  }

  weekEventStatusLabel(event: CalendarEvent): string {
    return (event.meta?.['statusLabel'] as string | undefined) ?? event.title;
  }

  weekEventTimeRange(event: CalendarEvent): string {
    return (event.meta?.['timeRange'] as string | undefined) ?? '';
  }

  weekEventDuration(event: CalendarEvent): string | null {
    const minutes = event.meta?.['durationMinutes'] as number | undefined;
    return minutes != null ? this.formatDuration(minutes) : null;
  }

  private allDayStatusEvent(
    dayDate: Date,
    statusKey: string,
    title: string,
    kind: string,
    record?: AttendanceResponse,
    status?: AttendanceDayStatus,
  ): CalendarEvent {
    return {
      start: dayDate,
      end: this.allDayEndDate(dayDate),
      title,
      allDay: true,
      color: STATUS_COLORS[statusKey] ?? STATUS_COLORS['present'],
      meta: {
        record,
        status,
        statusLabel: title,
        kind,
        tooltip: record ? this.buildTooltip(record, dayDate) : title,
      },
    };
  }

  private allDayEndDate(dayDate: Date): Date {
    return addDays(dayDate, 1);
  }

  private sessionEndTime(
    dayDate: Date,
    checkIn: Date,
    record: AttendanceResponse,
    status: AttendanceDayStatus,
  ): Date {
    const checkOut = this.combineAttendanceDateTime(dayDate, this.checkOutValue(record));
    if (checkOut) return checkOut;

    const durationMinutes = this.sessionDurationMinutes(record, dayDate);
    if (durationMinutes != null && durationMinutes > 0) {
      return new Date(checkIn.getTime() + durationMinutes * 60_000);
    }

    if (status === 'checkedIn' && isSameDay(dayDate, this.today)) {
      return new Date();
    }

    return new Date(checkIn.getTime() + 15 * 60_000);
  }

  private sessionDurationMinutes(record: AttendanceResponse, dayDate: Date): number | null {
    return this.attendanceDurationMinutes(record, dayDate);
  }

  private attendanceDurationMinutes(record: AttendanceResponse, dayDate: Date): number | null {
    const checkIn = this.combineAttendanceDateTime(dayDate, this.checkInValue(record));
    const checkOut = this.combineAttendanceDateTime(dayDate, this.checkOutValue(record));

    if (checkIn && checkOut) {
      return Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60_000));
    }

    if (checkIn && record.durationMinutes != null && record.durationMinutes >= 0) {
      return record.durationMinutes;
    }

    return null;
  }

  private buildTooltip(record: AttendanceResponse, dayDate: Date): string {
    const dateLabel = format(dayDate, 'EEE, MMM d, yyyy');
    const status = this.statusLabel(record.status);
    const checkIn = this.formatTime(this.checkInValue(record));
    const checkOut = this.checkOutValue(record)
      ? this.formatTime(this.checkOutValue(record))
      : record.status === AttendanceStatus.CheckedIn ? 'In session' : '—';
    const duration = this.sessionDurationMinutes(record, dayDate);
    const durationLabel = duration != null ? this.formatDuration(duration) : '—';
    return `${dateLabel}\n${status}\nIn: ${checkIn} · Out: ${checkOut}\nOn premises: ${durationLabel}`;
  }

  private toDayStatus(status?: AttendanceStatus | null, date?: Date): AttendanceDayStatus {
    if (date && isAfter(startOfDay(date), this.today)) return 'future';

    switch (status) {
      case AttendanceStatus.CheckedIn:
        return 'checkedIn';
      case AttendanceStatus.Present:
      case AttendanceStatus.CheckedOut:
      case AttendanceStatus.AutoCheckedOut:
      case AttendanceStatus.MissedCheckout:
      case AttendanceStatus.HalfDay:
        return 'present';
      case AttendanceStatus.Late:
        return 'late';
      case AttendanceStatus.Absent:
        return 'absent';
      case AttendanceStatus.Leave:
      case AttendanceStatus.Holiday:
        return 'holiday';
      default:
        return 'none';
    }
  }

  statusLabel(status?: AttendanceStatus | null): string {
    if (!status) return 'None';
    return AttendanceStatus[status]?.replace(/([A-Z])/g, ' $1').trim() ?? 'None';
  }

  private normalizeDate(value?: string | null): string {
    if (!value) return '';
    return value.length >= 10 ? value.slice(0, 10) : value;
  }

  private parseAttendanceDate(value?: string | null): Date {
    const normalized = this.normalizeDate(value);
    if (!normalized) return new Date();
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private checkInValue(record: AttendanceResponse): string | Date | null | undefined {
    return record.checkInAtUtc ?? record.checkInTime;
  }

  private checkOutValue(record: AttendanceResponse): string | Date | null | undefined {
    return record.checkOutAtUtc ?? record.checkOutTime;
  }

  private combineAttendanceDateTime(dayDate: Date, value?: string | Date | null): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        value.getHours(),
        value.getMinutes(),
        0,
        0,
      );
    }

    if (/^\d{2}:\d{2}/.test(value)) {
      const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
      const combined = new Date(dayDate);
      combined.setHours(hours, minutes, 0, 0);
      return combined;
    }

    const parsed = value.includes('T') ? parseISO(value) : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return new Date(
      dayDate.getFullYear(),
      dayDate.getMonth(),
      dayDate.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      0,
      0,
    );
  }

  private formatTime(value?: string | Date | null): string {
    if (!value) return '—';
    if (typeof value === 'string') {
      if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, 'HH:mm');
      }
      return value;
    }
    return format(value, 'HH:mm');
  }

  private formatDuration(minutes: number): string {
    if (minutes <= 0) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }
}
