import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendarCheck,
  LucideClock,
  LucideTrendingUp,
  LucideUsers,
} from '@lucide/angular';
import { ChartModule } from 'primeng/chart';
import { AttendanceAnalytics } from '@core/models/attendanceModels';
import { AttendanceModuleService } from '@core/services/attendance-module.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { AttendanceFilterService } from '../attendance-filter.service';
import {
  attendanceShiftMixChartOptions,
  buildAttendanceHourlyBarData,
  buildAttendanceHourlyBarOptions,
  buildAttendanceLateAreaData,
  buildAttendanceLateAreaOptions,
  buildAttendanceShiftMixData,
  buildAttendanceTrendBarData,
  buildAttendanceTrendBarOptions,
  shiftMixLegend,
} from '../attendance.util';

type TrendRange = 7 | 14 | 30;

@Component({
  selector: 'app-attendance-overview',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    GlassCardComponent,
    SectionHeaderComponent,
    KpiCardComponent,
    ChartModule,
    LucideCalendarCheck,
    LucideTrendingUp,
    LucideClock,
    LucideUsers,
    LucideArrowRight,
  ],
  templateUrl: './attendance-overview.component.html',
  styleUrl: '../attendance-shell/attendance-shell.component.css',
})
export class AttendanceOverviewComponent {
  private readonly moduleService = inject(AttendanceModuleService);
  private readonly filters = inject(AttendanceFilterService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly analytics = signal<AttendanceAnalytics | null>(null);
  readonly range = signal<TrendRange>(14);
  readonly rangeOptions: TrendRange[] = [7, 14, 30];

  readonly trendPoints = computed(() => this.analytics()?.trend ?? []);
  readonly shiftMixItems = computed(() => this.analytics()?.shiftMix ?? []);
  readonly hourlyPoints = computed(() => this.analytics()?.hourlyToday ?? []);

  readonly trendBarData = computed(() => buildAttendanceTrendBarData(this.trendPoints()));
  readonly trendBarOptions = computed(() => buildAttendanceTrendBarOptions(this.trendPoints()));
  readonly lateAreaData = computed(() => buildAttendanceLateAreaData(this.trendPoints()));
  readonly lateAreaOptions = computed(() => buildAttendanceLateAreaOptions(this.trendPoints()));
  readonly hourlyBarData = computed(() => buildAttendanceHourlyBarData(this.hourlyPoints()));
  readonly hourlyBarOptions = computed(() => buildAttendanceHourlyBarOptions(this.hourlyPoints()));
  readonly shiftMixData = computed(() => buildAttendanceShiftMixData(this.shiftMixItems()));
  readonly shiftMixLegendItems = computed(() => shiftMixLegend(this.shiftMixItems()));
  readonly shiftMixOptions = attendanceShiftMixChartOptions;

  constructor() {
    effect(() => {
      this.filters.libraryId();
      this.filters.librariesLoaded();
      this.range();
      this.loadAnalytics();
    });
  }

  setRange(value: TrendRange): void {
    this.range.set(value);
  }

  private loadAnalytics(): void {
    if (!this.filters.librariesLoaded()) {
      return;
    }

    this.loading.set(true);
    this.moduleService.getAnalytics({
      libraryId: this.filters.libraryId() || undefined,
      days: this.range(),
    }).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.analytics.set(null);
        this.toast.error(err?.error?.message ?? 'Could not load attendance analytics');
      },
    });
  }
}
