import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LucideActivity, LucideIndianRupee, LucideTrendingUp, LucideUsers } from '@lucide/angular';
import { DashboardOverview } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  buildAttendanceBarChartData,
  buildBarChartOptions,
  buildLineChartOptions,
  buildRevenueAreaChartData,
  formatDashboardCurrency,
} from './dashboard-chart.util';
import { DashboardFilterService } from './dashboard-filter.service';
import { DashboardHeaderService } from './dashboard-header.service';

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [ChartModule, SectionHeaderComponent, GlassCardComponent, KpiCardComponent, LucideIndianRupee, LucideTrendingUp, LucideActivity, LucideUsers],
  templateUrl: './dashboard-analytics.component.html',
})
export class DashboardAnalyticsComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly header = inject(DashboardHeaderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);
  readonly formatCurrency = formatDashboardCurrency;
  readonly revenueChart = computed(() => buildRevenueAreaChartData(this.data()?.revenueTrend ?? []));
  readonly attendanceChart = computed(() => buildAttendanceBarChartData(this.data()?.attendanceTrend ?? []));
  readonly lineOptions = buildLineChartOptions();
  readonly barOptions = buildBarChartOptions();

  readonly totalRevenue = computed(() => (this.data()?.revenueTrend ?? []).reduce((s, r) => s + r.revenue, 0));
  readonly totalRenewals = computed(() => (this.data()?.revenueTrend ?? []).reduce((s, r) => s + r.renewals, 0));

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
        this.header.update({
          title: overview.isSuperAdmin ? 'Cross-tenant analytics' : 'Your library analytics',
          description: `${overview.scopeLabel} · ${overview.periodLabel}`,
        });
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.toast.error(err?.error?.message ?? 'Could not load analytics'); },
    });
  }
}
