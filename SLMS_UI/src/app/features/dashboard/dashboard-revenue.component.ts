import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LucideAlertTriangle, LucideIndianRupee, LucideRepeat, LucideTrendingUp } from '@lucide/angular';
import { DashboardRevenue } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  buildLineChartOptions,
  buildRevenueAreaChartData,
  formatDashboardCurrency,
} from './dashboard-chart.util';
import { DashboardFilterService } from './dashboard-filter.service';
import { DashboardHeaderService } from './dashboard-header.service';
import { DashboardRevenueChartsComponent } from './dashboard-revenue-charts.component';

@Component({
  selector: 'app-dashboard-revenue',
  standalone: true,
  imports: [
    DatePipe,
    ChartModule,
    SectionHeaderComponent,
    GlassCardComponent,
    KpiCardComponent,
    LucideIndianRupee,
    LucideRepeat,
    LucideTrendingUp,
    LucideAlertTriangle,
    DashboardRevenueChartsComponent,
  ],
  templateUrl: './dashboard-revenue.component.html',
})
export class DashboardRevenueComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly header = inject(DashboardHeaderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardRevenue | null>(null);
  readonly formatCurrency = formatDashboardCurrency;
  readonly chartData = computed(() => buildRevenueAreaChartData(this.data()?.trend ?? []));
  readonly chartOptions = buildLineChartOptions();

  readonly revenueCharts = computed(() => this.data()?.revenueCharts ?? {
    monthlyTrend: [],
    quarterlyTrend: [],
    yearlyTrend: [],
  });

  constructor() {
    effect(() => {
      this.filters.query();
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.getRevenue(this.filters.query()).subscribe({
      next: (revenue) => {
        this.data.set(revenue);
        this.header.update({
          description: `${revenue.scopeLabel} · ${revenue.periodLabel}`,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load revenue dashboard');
      },
    });
  }
}
