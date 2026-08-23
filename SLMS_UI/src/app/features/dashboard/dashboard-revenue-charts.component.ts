import { Component, computed, input, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { DashboardRevenueCharts, DashboardTrendPoint } from '@core/models/dashboard.models';
import { GlassCardComponent, SectionHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  buildBarChartOptions,
  buildRevenueBarChartData,
  formatDashboardCurrency,
  formatTrendBucketLabel,
} from './dashboard-chart.util';

interface RevenueChartPanel {
  key: string;
  title: string;
  description: string;
  rows: DashboardTrendPoint[];
  chartData: ReturnType<typeof buildRevenueBarChartData>;
}

@Component({
  selector: 'app-dashboard-revenue-charts',
  standalone: true,
  imports: [ChartModule, GlassCardComponent, SectionHeaderComponent],
  template: `
    @if (variant() === 'tabs') {
      <app-glass-card class="block">
        <app-section-header title="Revenue by period" description="Monthly, quarterly and yearly breakdown" />
        <div class="mb-4 flex flex-wrap gap-1.5">
          @for (panel of panels(); track panel.key) {
            <button type="button" (click)="activePanel.set(panel.key)" [class]="tabClass(panel.key)">
              {{ panel.title }}
            </button>
          }
        </div>
        @if (activePanelData(); as panel) {
          <div class="h-[200px]">
            <p-chart type="bar" [data]="panel.chartData" [options]="chartOptions" />
          </div>
          @if (showTables()) {
            <div class="mt-4 overflow-x-auto max-h-40 overflow-y-auto rounded-md border bg-[var(--card)]">
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b label-mono text-left">
                    <th class="sticky top-0 z-10 bg-[var(--card)] py-1.5 px-2 font-medium shadow-[inset_0_-1px_0_var(--border)]">Period</th>
                    <th class="sticky top-0 z-10 bg-[var(--card)] py-1.5 px-2 font-medium text-right shadow-[inset_0_-1px_0_var(--border)]">Revenue</th>
                    <th class="sticky top-0 z-10 bg-[var(--card)] py-1.5 px-2 font-medium text-right shadow-[inset_0_-1px_0_var(--border)]">Renewals</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of tableRows(panel.rows); track row.date) {
                    <tr class="border-b last:border-0 hover:bg-muted/30">
                      <td class="py-1.5 px-2">{{ formatBucket(row.date) }}</td>
                      <td class="py-1.5 px-2 text-right tabular-nums">{{ formatCurrency(row.revenue) }}</td>
                      <td class="py-1.5 px-2 text-right tabular-nums">{{ formatCurrency(row.renewals) }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="py-4 text-center text-muted-foreground">No revenue data</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </app-glass-card>
    } @else {
      <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        @for (panel of panels(); track panel.key) {
          <app-glass-card class="block p-5">
            <app-section-header [title]="panel.title" [description]="panel.description" />
            <div class="h-[200px]">
              <p-chart type="bar" [data]="panel.chartData" [options]="chartOptions" />
            </div>
            @if (showTables()) {
              <div class="mt-4 overflow-x-auto max-h-48 overflow-y-auto rounded-md border bg-[var(--card)]">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b label-mono text-left">
                      <th class="sticky top-0 z-10 bg-[var(--card)] py-1.5 px-1 font-medium shadow-[inset_0_-1px_0_var(--border)]">Period</th>
                      <th class="sticky top-0 z-10 bg-[var(--card)] py-1.5 px-1 font-medium text-right shadow-[inset_0_-1px_0_var(--border)]">Revenue</th>
                      <th class="sticky top-0 z-10 bg-[var(--card)] py-1.5 px-1 font-medium text-right shadow-[inset_0_-1px_0_var(--border)]">Renewals</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of tableRows(panel.rows); track row.date) {
                      <tr class="border-b last:border-0 hover:bg-muted/30">
                        <td class="py-1.5 px-1">{{ formatBucket(row.date) }}</td>
                        <td class="py-1.5 px-1 text-right tabular-nums">{{ formatCurrency(row.revenue) }}</td>
                        <td class="py-1.5 px-1 text-right tabular-nums">{{ formatCurrency(row.renewals) }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="py-4 text-center text-muted-foreground">No revenue data</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </app-glass-card>
        }
      </section>
    }
  `,
})
export class DashboardRevenueChartsComponent {
  readonly charts = input.required<DashboardRevenueCharts>();
  readonly variant = input<'grid' | 'tabs'>('grid');
  readonly showTables = input(true);

  readonly formatCurrency = formatDashboardCurrency;
  readonly formatBucket = formatTrendBucketLabel;
  readonly chartOptions = buildBarChartOptions();
  readonly activePanel = signal('monthly');

  readonly panels = computed<RevenueChartPanel[]>(() => {
    const data = this.charts();
    return [
      {
        key: 'monthly',
        title: 'Monthly',
        description: 'Last 12 months',
        rows: data.monthlyTrend ?? [],
        chartData: buildRevenueBarChartData(data.monthlyTrend ?? []),
      },
      {
        key: 'quarterly',
        title: 'Quarterly',
        description: 'Last 4 quarters',
        rows: data.quarterlyTrend ?? [],
        chartData: buildRevenueBarChartData(data.quarterlyTrend ?? []),
      },
      {
        key: 'yearly',
        title: 'Yearly',
        description: 'Last 5 years',
        rows: data.yearlyTrend ?? [],
        chartData: buildRevenueBarChartData(data.yearlyTrend ?? []),
      },
    ];
  });

  readonly activePanelData = computed(() =>
    this.panels().find((panel) => panel.key === this.activePanel()) ?? this.panels()[0],
  );

  tabClass(key: string): string {
    const active = this.activePanel() === key;
    return `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'border text-muted-foreground hover:text-foreground'
    }`;
  }

  /** Table shows newest period first; chart keeps chronological order. */
  tableRows(rows: DashboardTrendPoint[]): DashboardTrendPoint[] {
    return [...rows].sort((a, b) => b.date.localeCompare(a.date));
  }
}
