import { Component, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LucideLayers } from '@lucide/angular';
import { DashboardOverview } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { GlassCardComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { buildLineChartOptions, formatDashboardCurrency } from './dashboard-chart.util';
import { DashboardFilterService } from './dashboard-filter.service';
import { DashboardHeaderService } from './dashboard-header.service';

@Component({
  selector: 'app-dashboard-subscriptions',
  standalone: true,
  imports: [ChartModule, SectionHeaderComponent, GlassCardComponent, LucideLayers],
  templateUrl: './dashboard-subscriptions.component.html',
})
export class DashboardSubscriptionsComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly header = inject(DashboardHeaderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);
  readonly formatCurrency = formatDashboardCurrency;

  readonly mrrChart = computed(() => {
    const points = this.data()?.revenueTrend ?? [];
    return {
      labels: points.map((p) => p.date),
      datasets: [
        {
          label: 'MRR proxy',
          data: points.map((p) => Math.round(p.revenue * 0.55)),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: 'Renewals',
          data: points.map((p) => p.renewals),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    };
  });

  readonly chartOptions = buildLineChartOptions();

  constructor() {
    effect(() => { this.filters.query(); this.load(); });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.getOverview(this.filters.query()).subscribe({
      next: (overview) => {
        this.data.set(overview);
        this.header.update({ description: overview.scopeLabel });
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.toast.error(err?.error?.message ?? 'Could not load subscriptions view'); },
    });
  }
}
