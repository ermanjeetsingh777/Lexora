import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { LucideArmchair, LucideBuilding2, LucideClock, LucideTrendingUp } from '@lucide/angular';
import { DashboardOverview } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { buildOccupancyLineChartData, buildLineChartOptions } from './dashboard-chart.util';
import { DashboardFilterService } from './dashboard-filter.service';
import { DashboardHeaderService } from './dashboard-header.service';

@Component({
  selector: 'app-dashboard-occupancy',
  standalone: true,
  imports: [RouterLink, ChartModule, SectionHeaderComponent, GlassCardComponent, KpiCardComponent, LucideArmchair, LucideTrendingUp, LucideClock, LucideBuilding2],
  templateUrl: './dashboard-occupancy.component.html',
})
export class DashboardOccupancyComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly header = inject(DashboardHeaderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);

  readonly occupancyTrend = computed(() =>
    (this.data()?.branchPerformance ?? []).map((b) => ({
      date: b.branchName,
      occupancy: b.occupancyPercent,
    })),
  );
  readonly chartData = computed(() => buildOccupancyLineChartData(this.occupancyTrend()));
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
      error: (err) => { this.loading.set(false); this.toast.error(err?.error?.message ?? 'Could not load occupancy'); },
    });
  }
}
