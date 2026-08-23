import { ChartData, ChartOptions } from 'chart.js';
import { DashboardAttendanceTrendPoint, DashboardTrendPoint } from '@core/models/dashboard.models';

const CHART_1 = '#2563eb';
const CHART_2 = '#16a34a';
const CHART_3 = '#f59e0b';
const CHART_4 = '#ef4444';

export function formatDashboardCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatTrendLabel(date: string): string {
  if (/^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-').map(Number);
    const parsed = new Date(year, month - 1, 1);
    return parsed.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatTrendBucketLabel(date: string): string {
  if (/^\d{4}-Q\d$/.test(date)) {
    const [year, quarter] = date.split('-');
    return `${quarter} ${year}`;
  }
  if (/^\d{4}$/.test(date)) {
    return date;
  }
  return formatTrendLabel(date);
}

export function buildRevenueBarChartData(points: DashboardTrendPoint[]): ChartData<'bar'> {
  return {
    labels: points.map((p) => formatTrendBucketLabel(p.date)),
    datasets: [
      { label: 'Revenue', data: points.map((p) => p.revenue), backgroundColor: CHART_1 },
      { label: 'Renewals', data: points.map((p) => p.renewals), backgroundColor: CHART_2 },
    ],
  };
}

export function buildRevenueAreaChartData(points: DashboardTrendPoint[]): ChartData<'line'> {
  return {
    labels: points.map((p) => formatTrendLabel(p.date)),
    datasets: [
      {
        label: 'Revenue',
        data: points.map((p) => p.revenue),
        borderColor: CHART_1,
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
      {
        label: 'Renewals',
        data: points.map((p) => p.renewals),
        borderColor: CHART_2,
        backgroundColor: 'rgba(22, 163, 74, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  };
}

export function buildAttendanceBarChartData(points: DashboardAttendanceTrendPoint[]): ChartData<'bar'> {
  return {
    labels: points.map((p) => formatTrendLabel(p.date)),
    datasets: [
      { label: 'Present', data: points.map((p) => p.present), backgroundColor: CHART_1 },
      { label: 'Late', data: points.map((p) => p.late), backgroundColor: CHART_4 },
      { label: 'Absent', data: points.map((p) => p.absent), backgroundColor: CHART_3 },
    ],
  };
}

export function buildMemberMixChartData(active: number, inactive: number, suspended: number): ChartData<'doughnut'> {
  return {
    labels: ['Active', 'Inactive', 'Suspended'],
    datasets: [
      {
        data: [active, inactive, suspended],
        backgroundColor: [CHART_1, CHART_3, CHART_4],
        borderWidth: 0,
      },
    ],
  };
}

export function buildLineChartOptions(currencyFormatter?: (value: number) => string): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, padding: 14 } },
      tooltip: {
        callbacks: currencyFormatter
          ? {
              label: (ctx) => `${ctx.dataset.label}: ${currencyFormatter(Number(ctx.raw ?? 0))}`,
            }
          : undefined,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 7, font: { size: 10 } } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: {
          font: { size: 10 },
          maxTicksLimit: 6,
          callback: currencyFormatter
            ? (value) => currencyFormatter(Number(value))
            : undefined,
        },
      },
    },
  };
}

export function buildBarChartOptions(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
    scales: {
      x: { stacked: false, grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.15)' }, ticks: { precision: 0, font: { size: 10 } } },
    },
  };
}

export function buildDoughnutChartOptions(): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
  };
}

export function buildOccupancyLineChartData(points: { date: string; occupancy: number }[]): ChartData<'line'> {
  return {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Occupancy %',
        data: points.map((p) => p.occupancy),
        borderColor: CHART_2,
        backgroundColor: 'rgba(22, 163, 74, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  };
}
