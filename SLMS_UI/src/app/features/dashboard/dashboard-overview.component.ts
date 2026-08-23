import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import {
  LucideArmchair, LucideArrowRight, LucideBuilding2, LucideIndianRupee, LucideUsers,
} from '@lucide/angular';
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
import { DashboardFiltersBarComponent } from './dashboard-filters-bar.component';
import { DashboardActivityFeedComponent } from './dashboard-activity-feed.component';
import { DashboardRevenueChartsComponent } from './dashboard-revenue-charts.component';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    RouterLink,
    ChartModule,
    SectionHeaderComponent,
    GlassCardComponent,
    KpiCardComponent,
    LucideUsers,
    LucideArmchair,
    LucideIndianRupee,
    LucideBuilding2,
    LucideArrowRight,
    DashboardActivityFeedComponent,
    DashboardRevenueChartsComponent,
    DashboardFiltersBarComponent,
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css',
})
export class DashboardOverviewComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly header = inject(DashboardHeaderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);
  readonly formatCurrency = formatDashboardCurrency;

  readonly revenueCharts = computed(() => this.data()?.revenueCharts ?? {
    monthlyTrend: [],
    quarterlyTrend: [],
    yearlyTrend: [],
  });

  readonly revenueChartData = computed(() =>
    buildRevenueAreaChartData(this.data()?.revenueTrend ?? []),
  );
  readonly periodRevenueTotal = computed(() =>
    (this.data()?.revenueTrend ?? []).reduce((sum, point) => sum + point.revenue, 0),
  );
  readonly periodRenewalsTotal = computed(() =>
    (this.data()?.revenueTrend ?? []).reduce((sum, point) => sum + point.renewals, 0),
  );
  readonly attendanceChartData = computed(() =>
    buildAttendanceBarChartData(this.data()?.attendanceTrend ?? []),
  );
  readonly lineChartOptions = computed(() => buildLineChartOptions(formatDashboardCurrency));
  readonly barChartOptions = buildBarChartOptions();

  memberMixRows(mix: DashboardOverview['memberMix']) {
    const total = Math.max(mix.total, 1);
    return [
      { key: 'active', label: 'Active', count: mix.active, percent: Math.round((mix.active / total) * 100), tone: 'active' },
      { key: 'inactive', label: 'Inactive', count: mix.inactive, percent: Math.round((mix.inactive / total) * 100), tone: 'inactive' },
      { key: 'suspended', label: 'Suspended', count: mix.suspended, percent: Math.round((mix.suspended / total) * 100), tone: 'suspended' },
    ];
  }

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
          description: overview.scopeLabel,
          isSuperAdmin: overview.isSuperAdmin,
          totalMembers: overview.kpis.totalMembers,
          totalLibraries: overview.kpis.totalLibraries,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load dashboard');
      },
    });
  }
}
