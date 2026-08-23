import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import {
  LucideArmchair, LucideArrowRight, LucideBell, LucideBuilding2, LucideIndianRupee, LucideUsers,
} from '@lucide/angular';
import { DashboardOverview } from '@core/models/dashboard.models';
import { DashboardService } from '@core/services/dashboard.service';
import { ToastService } from '@core/services/toast.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { GlassCardComponent, PageHeaderComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import {
  buildAttendanceBarChartData,
  buildBarChartOptions,
  buildDoughnutChartOptions,
  buildLineChartOptions,
  buildMemberMixChartData,
  buildRevenueAreaChartData,
  formatDashboardCurrency,
} from './dashboard-chart.util';
import { DashboardFilterService } from './dashboard-filter.service';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [
    RouterLink,
    ChartModule,
    PageHeaderComponent,
    SectionHeaderComponent,
    GlassCardComponent,
    KpiCardComponent,
    StatusBadgeComponent,
    LucideUsers,
    LucideArmchair,
    LucideIndianRupee,
    LucideBuilding2,
    LucideArrowRight,
    LucideBell,
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.css',
})
export class DashboardOverviewComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly filters = inject(DashboardFilterService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardOverview | null>(null);
  readonly formatCurrency = formatDashboardCurrency;

  readonly revenueChartData = computed(() =>
    buildRevenueAreaChartData(this.data()?.revenueTrend ?? []),
  );
  readonly attendanceChartData = computed(() =>
    buildAttendanceBarChartData(this.data()?.attendanceTrend ?? []),
  );
  readonly memberMixChartData = computed(() => {
    const mix = this.data()?.memberMix;
    return buildMemberMixChartData(mix?.active ?? 0, mix?.inactive ?? 0, mix?.suspended ?? 0);
  });

  readonly lineChartOptions = buildLineChartOptions();
  readonly barChartOptions = buildBarChartOptions();
  readonly doughnutChartOptions = buildDoughnutChartOptions();

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
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
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Could not load dashboard');
      },
    });
  }
}
