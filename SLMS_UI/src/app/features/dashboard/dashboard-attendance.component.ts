import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LucideCheckCircle2, LucideClock, LucideUsers, LucideXCircle } from '@lucide/angular';
import { DashboardOverview } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { buildAttendanceBarChartData, buildBarChartOptions } from './dashboard-chart.util';
import { DashboardFilterService } from './dashboard-filter.service';

@Component({
  selector: 'app-dashboard-attendance',
  standalone: true,
  imports: [
    ChartModule,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    KpiCardComponent,
    LucideUsers,
    LucideCheckCircle2,
    LucideClock,
    LucideXCircle,
  ],
  templateUrl: './dashboard-attendance.component.html',
})
export class DashboardAttendanceComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);

  readonly chartData = computed(() => buildAttendanceBarChartData(this.data()?.attendanceTrend ?? []));
  readonly chartOptions = buildBarChartOptions();

  readonly avgPresent = computed(() => {
    const trend = this.data()?.attendanceTrend ?? [];
    if (trend.length === 0) return 0;
    return Math.round(trend.reduce((s, d) => s + d.present, 0) / trend.length);
  });

  readonly totalLate = computed(() => (this.data()?.attendanceTrend ?? []).reduce((s, d) => s + d.late, 0));
  readonly totalAbsent = computed(() => (this.data()?.attendanceTrend ?? []).reduce((s, d) => s + d.absent, 0));

  readonly attendanceRate = computed(() => {
    const present = (this.data()?.attendanceTrend ?? []).reduce((s, d) => s + d.present, 0);
    const absent = this.totalAbsent();
    return present + absent > 0 ? Math.round((present / (present + absent)) * 100) : 0;
  });

  constructor() {
    effect(() => {
      this.filters.query();
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.getOverview(this.filters.query()).subscribe({
      next: (overview) => {
        this.data.set(overview);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load attendance dashboard');
      },
    });
  }
}
