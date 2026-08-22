import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import {
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideArrowLeft,
  LucideBookOpen,
  LucideBuilding2,
  LucideClock,
  LucideEye,
  LucideLayers,
  LucideMapPin,
  LucidePencil,
  LucidePlus,
  LucideQrCode,
  LucideRefreshCw,
  LucideShare2,
  LucideShieldCheck,
  LucideTrash2,
  LucideTrendingUp,
  LucideUsers,
} from '@lucide/angular';
import {
  DayKey,
  DaySlot,
  HoursException,
  LibraryDetailTab,
  LibraryDetailView,
  LibrarySeat,
  LibrarySection,
  TimeFormat,
  TrendRange,
} from '@core/models/library-detail.models';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { buttonVariants } from '@shared/components/button/button.variants';
import {
  GlassCardComponent,
  PageHeaderComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LibraryService } from '../library.service';
import {
  branchDefaultHours,
  buildLibraryOccupancyChartData,
  buildLibraryOccupancyChartOptions,
  currentShift,
  fmtTime,
  floorUtilisation,
  formatActivityTime,
  exceptionsFromApi,
  exceptionsToApiPayload,
  exceptionsDirty,
  isExceptionChanged,
  isExceptionNew,
  isExceptionPastLocked,
  layoutSeats,
  buildSeatTooltip,
  seatActiveMember,
  seatTileStyle,
  summarizeExceptionChanges,
  todayLocalDateString,
  TABS,
  libraryStatusVariant as resolveLibraryStatusVariant,
  seatStatusClass,
  sectionCapacityPercent,
  slotEqual,
  validateException,
  validateSlot,
  WEEK_DAYS,
  weeklyHoursFromApi,
  weeklyHoursToApiPayload,
} from './library-detail.util';
import { LibraryCalendarComponent } from './library-calendar/library-calendar.component';
import { ScopedMembersPanelComponent } from '../../members/components/scoped-members-panel/scoped-members-panel.component';
import { LibraryPlansPanelComponent } from '../components/library-plans-panel/library-plans-panel.component';
import { LibraryPlanFormDialogComponent } from '../components/library-plans-panel/library-plan-form-dialog.component';
import { ScannerQrCode } from '@core/models/attendanceModels';
import { collectRouteParams, libraryBackNav } from '@core/utils/entity-routes.util';

@Component({
  selector: 'app-library-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DecimalPipe,
    NgClass,
    NgStyle,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    StatusBadgeComponent,
    ButtonComponent,
    ChartModule,
    SelectButtonModule,
    LucideArrowLeft,
    LucideBuilding2,
    LucideBookOpen,
    LucideClock,
    LucideLayers,
    LucideMapPin,
  LucidePencil,
  LucideRefreshCw,
  LucideShare2,
  LucideShieldCheck,
  LucideAlertCircle,
    LucideAlertTriangle,
    LucideTrendingUp,
    LucideUsers,
    LucidePlus,
    LucideQrCode,
    LucideTrash2,
    LucideEye,
    LibraryCalendarComponent,
    ScopedMembersPanelComponent,
    LibraryPlansPanelComponent,
    LibraryPlanFormDialogComponent,
  ],
  templateUrl: './library-detail.component.html',
  styleUrls: [
    './library-detail.component.css',
    '../../institutions/institutions-list/institutions-list.css',
    '../../institutions/institution-detail/institution-detail.component.css',
  ],
})
export class LibraryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly libraryService = inject(LibraryService);
  private readonly toast = inject(ToastService);

  readonly plansPanel = viewChild(LibraryPlansPanelComponent);

  readonly tabs = TABS;
  readonly weekDays = WEEK_DAYS;
  readonly trendRanges: TrendRange[] = [7, 30, 90];
  readonly seatLegend = [
    { label: 'Available', className: 'lib-seat--available' },
    { label: 'Occupied', className: 'lib-seat--occupied' },
    { label: 'Reserved', className: 'lib-seat--reserved' },
    { label: 'Maintenance', className: 'lib-seat--maintenance' },
  ];
  readonly sectionDotClasses = [
    'lib-section-dot--primary',
    'lib-section-dot--success',
    'lib-section-dot--warning',
    'lib-section-dot--info',
    'lib-section-dot--danger',
  ];

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly detail = signal<LibraryDetailView | null>(null);
  readonly tab = signal<LibraryDetailTab>('overview');
  readonly timeFmt = signal<TimeFormat>(this.loadTimeFormat());
  readonly trendRange = signal<TrendRange>(30);
  readonly showErrors = signal(false);
  readonly seatPreviewOpen = signal(false);
  readonly seatFloatingTooltip = signal<{
    text: string;
    x: number;
    y: number;
    placement: 'above' | 'below';
  } | null>(null);
  readonly attendanceQr = signal<ScannerQrCode | null>(null);
  readonly attendanceQrLoading = signal(false);

  readonly profileName = signal('');
  readonly profileFloor = signal(1);
  readonly profileCapacity = signal(0);
  readonly weeklyHours = signal<Record<DayKey, DaySlot>>(branchDefaultHours(null, null));
  readonly hoursExceptions = signal<HoursException[]>([]);
  readonly savedExceptions = signal<HoursException[]>([]);
  readonly sections = signal<LibrarySection[]>([]);

  readonly branchDefaults = computed(() => {
    const d = this.detail();
    return branchDefaultHours(d?.branchHoursStart, d?.branchHoursEnd);
  });

  readonly capacity = computed(() => this.detail()?.capacity ?? 0);
  readonly occupied = computed(() => this.detail()?.memberCount ?? 0);
  readonly onFloorNow = computed(() => this.detail()?.checkedInToday ?? 0);
  readonly available = computed(() => Math.max(0, this.capacity() - this.occupied()));
  readonly occupancyPercent = computed(() => {
    const d = this.detail();
    if (d) return Math.round(d.occupancyPercent);
    const cap = this.capacity();
    return cap > 0 ? Math.round((this.occupied() / cap) * 100) : 0;
  });

  readonly peakHourLabel = computed(() => {
    const d = this.detail();
    if (!d?.peakHourStart || !d.peakHourEnd) return '—';
    return `${fmtTime(d.peakHourStart, this.timeFmt())}–${fmtTime(d.peakHourEnd, this.timeFmt())}`;
  });

  readonly libraryMetrics = computed(() => [
    { label: 'Capacity', value: this.capacity().toLocaleString(), highlight: false },
    { label: 'Occupied', value: this.occupied().toLocaleString(), highlight: true },
    { label: 'Available', value: this.available().toLocaleString(), highlight: false },
    { label: 'On floor', value: this.onFloorNow().toLocaleString(), highlight: false },
  ]);

  readonly librarySnapshotMetrics = computed(() => {
    const d = this.detail();
    if (!d) return [];
    return [
      { label: 'Occupancy', value: `${this.occupancyPercent()}%`, highlight: true },
      { label: 'Floor', value: d.floor != null ? String(d.floor) : '—', highlight: false },
      { label: 'Status', value: d.status, highlight: false },
      { label: 'Hours', value: this.subtitleHours(), highlight: false },
    ];
  });

  readonly occupancyLabel = computed(() => {
    const occ = this.occupancyPercent();
    if (occ >= 80) return 'High utilization';
    if (occ >= 50) return 'Moderate utilization';
    if (occ > 0) return 'Low utilization';
    return 'No occupancy data';
  });

  readonly occupancyTone = computed(() => {
    const occ = this.occupancyPercent();
    if (occ >= 80) return 'high';
    if (occ >= 50) return 'mid';
    return 'low';
  });

  readonly subtitleHours = computed(() => {
    const d = this.detail();
    return `${fmtTime(d?.hoursStart, this.timeFmt())}–${fmtTime(d?.hoursEnd, this.timeFmt())}`;
  });

  readonly trendPoints = computed(() => this.detail()?.occupancyTrend ?? []);

  readonly occupancyChartData = computed(() => buildLibraryOccupancyChartData(this.trendPoints()));
  readonly occupancyChartOptions = buildLibraryOccupancyChartOptions();

  readonly seats = computed(() => layoutSeats(this.detail()?.seats ?? []));
  readonly recentActivity = computed(() => this.detail()?.recentActivity ?? []);

  readonly dayErrors = computed(() =>
    Object.fromEntries(WEEK_DAYS.map((d) => [d.key, validateSlot(this.weeklyHours()[d.key])])) as Record<
      DayKey,
      string | null
    >,
  );

  readonly weeklyHasErrors = computed(() => WEEK_DAYS.some((d) => this.dayErrors()[d.key]));
  readonly exceptionErrors = computed(() =>
    this.hoursExceptions().map((exception) => validateException(exception, this.savedExceptions())),
  );
  readonly exceptionsHaveErrors = computed(() => this.exceptionErrors().some((e) => e !== null));
  readonly exceptionsHaveChanges = computed(() =>
    exceptionsDirty(this.hoursExceptions(), this.savedExceptions()),
  );
  readonly exceptionChangeSummary = computed(() =>
    summarizeExceptionChanges(this.hoursExceptions(), this.savedExceptions()),
  );

  readonly totalSectionCapacity = computed(() =>
    this.sections().reduce((sum, section) => sum + Number(section.capacity || 0), 0),
  );

  readonly sectionsOverflow = computed(() => this.totalSectionCapacity() > this.capacity());

  readonly floorTotals = computed(() => {
    const rows = this.detail()?.floorBreakdown ?? [];
    return rows.reduce(
      (acc, row) => ({
        libraries: acc.libraries + row.libraries,
        capacity: acc.capacity + row.capacity,
        occupied: acc.occupied + row.occupied,
      }),
      { libraries: 0, capacity: 0, occupied: 0 },
    );
  });

  readonly outlineButtonClass = buttonVariants({ variant: 'outline', size: 'sm' });
  readonly destructiveButtonClass = buttonVariants({ variant: 'destructive', size: 'sm' });
  readonly defaultButtonClass = buttonVariants({ variant: 'default', size: 'sm' });

  readonly libraryStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' =>
    resolveLibraryStatusVariant(status);
  readonly fmtTime = fmtTime;
  readonly slotEqual = slotEqual;
  readonly seatStatusClass = seatStatusClass;
  readonly buildSeatTooltip = buildSeatTooltip;
  readonly seatActiveMember = seatActiveMember;
  readonly seatTileStyle = seatTileStyle;
  readonly floorUtilisation = floorUtilisation;
  readonly sectionCapacityPercent = sectionCapacityPercent;
  readonly currentShift = currentShift;
  readonly formatActivityTime = formatActivityTime;

  get routeParams(): Record<string, string> {
    return collectRouteParams(this.route.snapshot);
  }

  get backLink(): string | string[] {
    return libraryBackNav(this.routeParams).link;
  }

  get backQueryParams(): { tab: string } | undefined {
    return libraryBackNav(this.routeParams).queryParams;
  }

  get backLabel(): string {
    return libraryBackNav(this.routeParams).label;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('libraryId');
      if (!id) {
        this.error.set('Library id is missing.');
        this.loading.set(false);
        return;
      }
      this.loadDetail(id);
    });

    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') as LibraryDetailTab | null;
      if (tab && TABS.some((t) => t.id === tab)) {
        this.tab.set(tab);
      }
    });
  }

  setTab(value: LibraryDetailTab): void {
    this.tab.set(value);
  }

  setTimeFormat(value: TimeFormat): void {
    this.timeFmt.set(value);
    localStorage.setItem('lib-time-fmt', value);
  }

  setTrendRange(value: TrendRange): void {
    this.trendRange.set(value);
    const id = this.detail()?.id;
    if (id) this.loadDetail(id, false);
  }

  resyncFromBranch(): void {
    const d = this.detail();
    if (!d) return;

    const defaults = this.branchDefaults();
    const changed = WEEK_DAYS.filter((day) => !slotEqual(this.weeklyHours()[day.key], defaults[day.key]));
    const previous = this.weeklyHours();

    this.weeklyHours.set({ ...defaults });
    this.showErrors.set(false);

    if (this.weeklyHasErrors()) {
      this.weeklyHours.set(previous);
      this.toast.error('Branch operating hours are not set. Update the branch hours first.');
      return;
    }

    this.saving.set(true);
    this.libraryService
      .updateWeeklyHours(d.institutionId, d.branchId, d.id, {
        weeklyHours: weeklyHoursToApiPayload(defaults),
      })
      .pipe(
        catchError((err) => {
          this.weeklyHours.set(previous);
          this.toast.error(err?.error?.message ?? 'Failed to copy hours from branch');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((res) => {
        if (!res?.success) return;
        this.weeklyHours.set(weeklyHoursFromApi(res.data));
        if (changed.length === 0) {
          this.toast.success('Library weekly hours match branch defaults');
        } else {
          this.toast.success(`Reset ${changed.length} day${changed.length === 1 ? '' : 's'} to branch hours`);
        }
      });
  }

  updateDaySlot(key: DayKey, patch: Partial<DaySlot>): void {
    const current = this.weeklyHours()[key];
    this.weeklyHours.set({
      ...this.weeklyHours(),
      [key]: { ...current, ...patch },
    });
  }

  addException(): void {
    const today = todayLocalDateString();
    const next: HoursException = {
      id: crypto.randomUUID(),
      name: '',
      startDate: today,
      endDate: today,
      closed: true,
      open: null,
      close: null,
    };
    this.hoursExceptions.set([...this.hoursExceptions(), next]);
    this.showErrors.set(false);
  }

  todayDate(): string {
    return todayLocalDateString();
  }

  isExceptionLocked(exception: HoursException): boolean {
    return isExceptionPastLocked(exception);
  }

  isExceptionStartLocked(exception: HoursException): boolean {
    const original = this.savedExceptions().find((item) => item.id === exception.id);
    if (!original) return false;
    return original.startDate < todayLocalDateString();
  }

  isNewException(exception: HoursException): boolean {
    return isExceptionNew(this.savedExceptions(), exception);
  }

  isChangedException(exception: HoursException): boolean {
    return isExceptionChanged(this.savedExceptions(), exception);
  }

  discardExceptionChanges(): void {
    this.hoursExceptions.set(exceptionsFromApi(this.savedExceptions()));
    this.showErrors.set(false);
  }

  updateException(id: string, patch: Partial<HoursException>): void {
    const current = this.hoursExceptions().find((item) => item.id === id);
    if (!current || isExceptionPastLocked(current)) return;

    const today = todayLocalDateString();
    const original = this.savedExceptions().find((item) => item.id === id);
    if (patch.startDate != null && patch.startDate < today) {
      if (!original || patch.startDate !== original.startDate) return;
    }
    if (patch.endDate != null && patch.endDate < today) return;

    this.hoursExceptions.set(
      this.hoursExceptions().map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  removeException(id: string): void {
    const current = this.hoursExceptions().find((item) => item.id === id);
    if (current && isExceptionPastLocked(current)) {
      this.toast.error('Past exceptions cannot be deleted');
      return;
    }

    this.hoursExceptions.set(this.hoursExceptions().filter((item) => item.id !== id));
  }

  addSection(): void {
    const nextLetter = String.fromCharCode(65 + this.sections().length);
    this.sections.set([...this.sections(), { name: `Section ${nextLetter}`, capacity: 10 }]);
  }

  updateSection(index: number, patch: Partial<LibrarySection>): void {
    this.sections.set(
      this.sections().map((section, i) => (i === index ? { ...section, ...patch } : section)),
    );
  }

  removeSection(index: number): void {
    this.sections.set(this.sections().filter((_, i) => i !== index));
  }

  saveProfile(): void {
    const d = this.detail();
    if (!d) return;
    this.saving.set(true);
    this.libraryService
      .updateLibrary(d.institutionId, d.branchId, d.id, {
        name: this.profileName().trim(),
        floor: this.profileFloor(),
        capacity: this.profileCapacity(),
      })
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message ?? 'Failed to save profile');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((res) => {
        if (!res?.success) return;
        this.toast.success('Profile saved');
        this.loadDetail(d.id, false);
      });
  }

  toggleActive(): void {
    const d = this.detail();
    if (!d) return;
    const nextActive = !d.isActive;
    this.saving.set(true);
    this.libraryService
      .updateLibrary(d.institutionId, d.branchId, d.id, { isActive: nextActive })
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message ?? 'Failed to update status');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((res) => {
        if (!res?.success) return;
        this.toast.success(nextActive ? 'Library activated' : 'Library deactivated');
        this.loadDetail(d.id, false);
      });
  }

  saveWeeklyHours(): void {
    const d = this.detail();
    if (!d) return;

    this.showErrors.set(true);
    if (this.weeklyHasErrors()) {
      this.toast.error('Fix the highlighted errors before saving');
      return;
    }

    this.saving.set(true);
    this.libraryService
      .updateWeeklyHours(d.institutionId, d.branchId, d.id, {
        weeklyHours: weeklyHoursToApiPayload(this.weeklyHours()),
      })
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message ?? 'Failed to save weekly hours');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((res) => {
        if (!res?.success) return;
        this.weeklyHours.set(weeklyHoursFromApi(res.data));
        this.showErrors.set(false);
        this.toast.success('Weekly hours saved');
      });
  }

  saveExceptions(): void {
    const d = this.detail();
    if (!d) return;

    if (!this.exceptionsHaveChanges()) {
      this.toast.info('No exception changes to save');
      return;
    }

    this.showErrors.set(true);
    if (this.exceptionsHaveErrors()) {
      this.toast.error('Fix the highlighted errors before saving');
      return;
    }

    const changeSummary = this.exceptionChangeSummary();
    this.saving.set(true);
    this.libraryService
      .updateHoursExceptions(d.institutionId, d.branchId, d.id, {
        exceptions: exceptionsToApiPayload(this.hoursExceptions()),
      })
      .pipe(
        catchError((err) => {
          this.toast.error(err?.error?.message ?? 'Failed to save exceptions');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((res) => {
        if (!res?.success) return;
        const saved = exceptionsFromApi(res.data);
        this.hoursExceptions.set(saved);
        this.savedExceptions.set(saved);
        this.showErrors.set(false);
        this.toast.success(this.exceptionSaveMessage(changeSummary));
      });
  }

  private exceptionSaveMessage(summary: { added: number; updated: number; removed: number }): string {
    const parts: string[] = [];
    if (summary.added > 0) parts.push(`${summary.added} added`);
    if (summary.updated > 0) parts.push(`${summary.updated} updated`);
    if (summary.removed > 0) parts.push(`${summary.removed} removed`);
    return parts.length ? `Exceptions saved (${parts.join(', ')})` : 'Exceptions saved';
  }

  private syncSavedExceptions(items: HoursException[]): void {
    const saved = exceptionsFromApi(items);
    this.hoursExceptions.set(saved);
    this.savedExceptions.set(saved);
  }

  saveSections(): void {
    if (this.sectionsOverflow()) {
      this.toast.error('Sections exceed library capacity');
      return;
    }
    this.toast.success('Layout saved');
  }

  shareLink(): void {
    navigator.clipboard.writeText(window.location.href).then(
      () => this.toast.success('Link copied'),
      () => this.toast.error('Could not copy link'),
    );
  }

  openSeatPreview(): void {
    this.seatPreviewOpen.set(true);
  }

  closeSeatPreview(): void {
    this.seatPreviewOpen.set(false);
    this.hideSeatTooltip();
  }

  showSeatTooltip(event: Event, seat: LibrarySeat): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const text = buildSeatTooltip(seat);
    const edgePadding = 12;
    const estimatedWidth = 224;
    let x = rect.left + rect.width / 2;
    x = Math.max(
      edgePadding + estimatedWidth / 2,
      Math.min(x, window.innerWidth - edgePadding - estimatedWidth / 2),
    );

    const belowY = rect.bottom + 8;
    const placement = belowY + 96 > window.innerHeight ? 'above' : 'below';

    this.seatFloatingTooltip.set({
      text,
      x,
      y: placement === 'below' ? belowY : rect.top - 8,
      placement,
    });
  }

  hideSeatTooltip(): void {
    this.seatFloatingTooltip.set(null);
  }

  private loadDetail(id: string, showLoader = true): void {
    if (showLoader) {
      this.loading.set(true);
      this.error.set(null);
    }

    this.libraryService
      .getDetailView(id, { trendDays: this.trendRange() })
      .pipe(
        catchError((err) => {
          this.error.set(err?.error?.message ?? 'Library not found');
          this.detail.set(null);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((view) => {
        if (!view) return;
        this.detail.set(view);
        this.profileName.set(view.name);
        this.profileFloor.set(view.floor ?? 1);
        this.profileCapacity.set(view.capacity);
        this.weeklyHours.set(weeklyHoursFromApi(view.weeklyHours));
        this.syncSavedExceptions(view.hoursExceptions);
        this.sections.set(
          view.sections.map((section) => ({
            name: section.name,
            capacity: section.capacity,
          })),
        );
        this.showErrors.set(false);
        this.loadAttendanceQr(view.id);
      });
  }

  private loadAttendanceQr(libraryId: string): void {
    this.attendanceQrLoading.set(true);
    this.libraryService.getAttendanceQr(libraryId).subscribe({
      next: (qr) => {
        this.attendanceQr.set(qr);
        this.attendanceQrLoading.set(false);
      },
      error: () => {
        this.attendanceQr.set(null);
        this.attendanceQrLoading.set(false);
      },
    });
  }

  private loadTimeFormat(): TimeFormat {
    const stored = localStorage.getItem('lib-time-fmt');
    return stored === '12h' ? '12h' : '24h';
  }
}
