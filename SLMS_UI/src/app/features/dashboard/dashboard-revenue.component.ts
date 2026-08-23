import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LucideAlertTriangle, LucideIndianRupee, LucideRepeat, LucideTrendingUp } from '@lucide/angular';
import { DashboardRevenue } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  buildLineChartOptions,
  buildRevenueAreaChartData,
  formatDashboardCurrency,
} from './dashboard-chart.util';
import { DashboardFilterService } from './dashboard-filter.service';

@Component({
  selector: 'app-dashboard-revenue',
  standalone: true,
  imports: [
    DatePipe,
    ChartModule,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    KpiCardComponent,
    LucideIndianRupee,
    LucideRepeat,
    LucideTrendingUp,
    LucideAlertTriangle,
  ],
  templateUrl: './dashboard-revenue.component.html',
})
export class DashboardRevenueComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardRevenue | null>(null);
  readonly formatCurrency = formatDashboardCurrency;
  readonly chartData = computed(() => buildRevenueAreaChartData(this.data()?.trend ?? []));
  readonly chartOptions = buildLineChartOptions();

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
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load revenue dashboard');
      },
    });
  }
}
