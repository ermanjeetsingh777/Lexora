import { NgClass } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
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
import { catchError, finalize, of } from 'rxjs';
import type { LibraryCalendarDay, LibraryCalendarDayStatus } from '@core/models/library-calendar.models';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { LibraryService } from '../../library.service';
import { WEEK_DAYS } from '../library-detail.util';
import {
  CALENDAR_STATUS_COLORS,
  calendarDayTooltip,
  calendarHoursLabel,
  calendarStatusBadgeClass,
  calendarStatusClass,
  calendarStatusLabel,
  calendarDayLabel,
} from './library-calendar.util';

type CalendarViewMode = CalendarView | 'year' | 'list';

@Component({
  selector: 'app-library-calendar',
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
  templateUrl: './library-calendar.component.html',
  styleUrl: './library-calendar.component.css',
  providers: [
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
})
export class LibraryCalendarComponent {
  readonly CalendarView = CalendarView;

  readonly libraryId = input.required<string>();

  private readonly libraryService = inject(LibraryService);

  readonly view = signal<CalendarViewMode>(CalendarView.Month);
  readonly internalViewDate = signal(startOfMonth(new Date()));
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly calendarDays = signal<LibraryCalendarDay[]>([]);
  readonly exceptions = signal<{ id: string; name: string; startDate: string; endDate: string; closed: boolean; open: string | null; close: string | null }[]>([]);

  readonly cellTemplateRef = viewChild<TemplateRef<unknown>>('calendarCellTpl');
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

  readonly daysByDate = computed(() => {
    const map = new Map<string, LibraryCalendarDay>();
    for (const day of this.calendarDays()) {
      map.set(day.date, day);
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
    if (this.view() === 'list') return `${format(date, 'MMMM yyyy')} schedule`;
    return format(date, 'MMMM yyyy');
  });

  readonly calendarEvents = computed<CalendarEvent[]>(() =>
    this.calendarDays().map((day) => this.toCalendarEvent(day)),
  );

  readonly weekTimesheetEvents = computed<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    for (const day of this.calendarDays()) {
      const dayDate = parseISO(day.date);
      if (day.closed || !day.open || !day.close) {
        events.push(this.toAllDayEvent(day, dayDate));
        continue;
      }

      events.push(this.toAllDayEvent(day, dayDate));
      const start = this.combineTime(dayDate, day.open);
      const end = this.combineTime(dayDate, day.close);
      if (start && end) {
        events.push({
          start,
          end,
          title: calendarHoursLabel(day),
          color: CALENDAR_STATUS_COLORS[day.status],
          meta: { day, kind: 'session', tooltip: calendarDayTooltip(day) },
        });
      }
    }
    return events;
  });

  readonly yearMonths = computed(() => {
    const year = this.internalViewDate().getFullYear();
    const months: { index: number; label: string; open: number; closed: number; holiday: number }[] = [];

    for (let month = 0; month < 12; month++) {
      let open = 0;
      let closed = 0;
      let holiday = 0;

      for (const day of this.calendarDays()) {
        const dayDate = parseISO(day.date);
        if (dayDate.getFullYear() !== year || dayDate.getMonth() !== month) continue;
        if (day.status === 'open' || day.status === 'exception') open++;
        else if (day.status === 'holiday') holiday++;
        else closed++;
      }

      months.push({
        index: month,
        label: format(new Date(year, month, 1), 'MMMM'),
        open,
        closed,
        holiday,
      });
    }

    return months;
  });

  readonly sortedDays = computed(() =>
    [...this.calendarDays()].sort((a, b) => a.date.localeCompare(b.date)),
  );

  constructor() {
    effect(() => {
      const libraryId = this.libraryId();
      const view = this.view();
      const viewDate = this.internalViewDate();
      if (!libraryId) return;

      const range = this.computeRange(view, viewDate);
      this.loadCalendar(libraryId, range.startDate, range.endDate);
    });
  }

  setView(next: CalendarViewMode): void {
    this.view.set(next);
  }

  onViewDateChanged(date: Date): void {
    this.internalViewDate.set(date);
  }

  goToday(): void {
    const today = new Date();
    this.internalViewDate.set(this.view() === CalendarView.Month || this.view() === 'list' ? startOfMonth(today) : today);
  }

  selectYearMonth(monthIndex: number): void {
    this.internalViewDate.set(new Date(this.internalViewDate().getFullYear(), monthIndex, 1));
    this.view.set(CalendarView.Month);
  }

  prevYear(): void {
    this.internalViewDate.set(new Date(this.internalViewDate().getFullYear() - 1, 0, 1));
  }

  nextYear(): void {
    this.internalViewDate.set(new Date(this.internalViewDate().getFullYear() + 1, 0, 1));
  }

  calendarNavView(): CalendarView {
    return this.view() === 'year' || this.view() === 'list' ? CalendarView.Month : (this.view() as CalendarView);
  }

  dayFor(date: Date): LibraryCalendarDay | undefined {
    return this.daysByDate().get(format(date, 'yyyy-MM-dd'));
  }

  cellClass(day: { date: Date }): string {
    const item = this.dayFor(day.date);
    if (!item) return 'lib-cal-day lib-cal-day--empty';
    return calendarStatusClass(item.status);
  }

  tooltipFor(day: { date: Date }): string {
    const item = this.dayFor(day.date);
    if (!item) return 'No schedule data';
    return calendarDayTooltip(item);
  }

  hoursFor(day: { date: Date }): string | null {
    const item = this.dayFor(day.date);
    if (!item) return null;
    if (item.closed) return 'Closed';
    return calendarHoursLabel(item);
  }

  weekEventClass(event: CalendarEvent): string {
    const day = event.meta?.['day'] as LibraryCalendarDay | undefined;
    const kind = event.meta?.['kind'] as string | undefined;
    if (!day) return 'lib-cal-event-wrap';
    if (kind === 'session') return `lib-cal-event-wrap lib-cal-event-wrap--timed lib-cal-event--${day.status}`;
    return `lib-cal-event-wrap lib-cal-event--${day.status}`;
  }

  isWeekStatusBadge(event: CalendarEvent): boolean {
    return !!event.allDay;
  }

  weekEventStatusLabel(event: CalendarEvent): string {
    const day = event.meta?.['day'] as LibraryCalendarDay | undefined;
    return day ? calendarDayLabel(day) : event.title;
  }

  weekEventTimeRange(event: CalendarEvent): string {
    const day = event.meta?.['day'] as LibraryCalendarDay | undefined;
    return day ? calendarHoursLabel(day) : '';
  }

  weekEventStartTime(event: CalendarEvent): string {
    const day = event.meta?.['day'] as LibraryCalendarDay | undefined;
    return day?.open ?? '';
  }

  weekEventEndTime(event: CalendarEvent): string {
    const day = event.meta?.['day'] as LibraryCalendarDay | undefined;
    return day?.close ?? '';
  }

  dayName(dayKey: string): string {
    return WEEK_DAYS.find((day) => day.key === dayKey)?.label ?? dayKey;
  }

  statusLabel(status: LibraryCalendarDayStatus): string {
    return calendarStatusLabel(status);
  }

  statusBadgeClass(status: LibraryCalendarDayStatus): string {
    return calendarStatusBadgeClass(status);
  }

  parseDate(value: string): Date {
    return parseISO(value);
  }

  private loadCalendar(libraryId: string, startDate: string, endDate: string): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.libraryService
      .getCalendarView(libraryId, { startDate, endDate })
      .pipe(
        catchError((err) => {
          this.loadError.set(err?.error?.message ?? 'Unable to load calendar.');
          this.calendarDays.set([]);
          this.exceptions.set([]);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((view) => {
        if (!view) return;
        this.calendarDays.set(view.days);
        this.exceptions.set(view.exceptions);
      });
  }

  private computeRange(view: CalendarViewMode, date: Date): { startDate: string; endDate: string } {
    if (view === 'year') {
      const year = date.getFullYear();
      return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
    }

    if (view === CalendarView.Week) {
      const start = startOfWeek(date, { weekStartsOn: 0 });
      const end = endOfWeek(date, { weekStartsOn: 0 });
      return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
    }

    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
  }

  private toCalendarEvent(day: LibraryCalendarDay): CalendarEvent {
    const dayDate = parseISO(day.date);
    return {
      start: dayDate,
      end: dayDate,
      title: calendarDayLabel(day),
      allDay: true,
      color: CALENDAR_STATUS_COLORS[day.status],
      meta: { day, tooltip: calendarDayTooltip(day) },
    };
  }

  private toAllDayEvent(day: LibraryCalendarDay, dayDate: Date): CalendarEvent {
    return {
      start: dayDate,
      end: addDays(dayDate, 1),
      title: calendarDayLabel(day),
      allDay: true,
      color: CALENDAR_STATUS_COLORS[day.status],
      meta: { day, kind: 'status', tooltip: calendarDayTooltip(day) },
    };
  }

  private combineTime(dayDate: Date, value: string): Date | null {
    if (!/^\d{2}:\d{2}/.test(value)) return null;
    const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
    const combined = new Date(dayDate);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }
}
