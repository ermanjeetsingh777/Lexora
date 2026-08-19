import type { ChartData, ChartOptions } from 'chart.js';

export interface FootfallDayPoint {
  day: string;
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}

export interface PeakHourPoint {
  hour: string;
  checkIns: number;
}

const SHIFT_COLORS = {
  morning: 'oklch(0.78 0.13 80)',
  afternoon: 'oklch(0.65 0.17 258)',
  evening: 'oklch(0.62 0.18 320)',
  night: 'oklch(0.55 0.12 230)',
};

const BAR_RADIUS = { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 } as const;

function footfallAxisScale(dataMax: number): { max: number; stepSize: number } {
  if (dataMax <= 0) return { max: 40, stepSize: 10 };
  if (dataMax <= 8) {
    const max = Math.max(8, Math.ceil(dataMax));
    return { max, stepSize: 2 };
  }
  if (dataMax <= 40) {
    const max = Math.ceil(dataMax / 10) * 10;
    return { max, stepSize: 10 };
  }
  const max = Math.ceil(dataMax / 40) * 40;
  return { max, stepSize: 40 };
}

export const FOOTFALL_SHIFT_LEGEND = [
  { label: 'Morning', color: SHIFT_COLORS.morning },
  { label: 'Afternoon', color: SHIFT_COLORS.afternoon },
  { label: 'Evening', color: SHIFT_COLORS.evening },
  { label: 'Night', color: SHIFT_COLORS.night },
] as const;

const OCCUPANCY_LINE = 'oklch(0.62 0.18 258)';

export interface OccupancyTrendPoint {
  date: string;
  value: number;
}

function occupancyAreaGradient(context: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }): string | CanvasGradient {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) {
    return 'rgba(59, 130, 246, 0.15)';
  }
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
  return gradient;
}

export function buildBranchOccupancyAreaChartData(points: OccupancyTrendPoint[]): ChartData<'line'> {
  return {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Occupancy %',
        data: points.map((p) => p.value),
        fill: true,
        tension: 0.4,
        borderColor: OCCUPANCY_LINE,
        backgroundColor: occupancyAreaGradient,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: OCCUPANCY_LINE,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHitRadius: 12,
        borderWidth: 2,
      },
    ],
  };
}

export function buildBranchOccupancyAreaChartOptions(dataMax = 0): ChartOptions<'line'> {
  const axisMax = Math.min(100, Math.max(80, Math.ceil(Math.max(dataMax, 1) / 20) * 20));

  return {
    maintainAspectRatio: false,
    responsive: true,
    elements: {
      line: { borderWidth: 2, tension: 0.4 },
      point: { radius: 0, hoverRadius: 4, hitRadius: 12 },
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 0, left: 0 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'var(--popover, #fff)',
        titleColor: 'var(--foreground, #0f172a)',
        bodyColor: 'var(--muted-foreground, #64748b)',
        borderColor: 'var(--border, #e2e8f0)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => ` Occupancy: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxTicksLimit: 14,
          maxRotation: 0,
          autoSkip: false,
          font: { size: 11 },
          color: 'var(--muted-foreground, #94a3b8)',
          padding: 4,
        },
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: axisMax,
        border: { display: false },
        grid: {
          color: 'rgba(148, 163, 184, 0.22)',
          drawTicks: false,
        },
        ticks: {
          stepSize: 20,
          maxTicksLimit: 5,
          font: { size: 11 },
          color: 'var(--muted-foreground, #94a3b8)',
          padding: 6,
          callback: (value) => `${value}`,
        },
      },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  };
}

export function buildFootfallChartData(points: FootfallDayPoint[]): ChartData<'bar'> {
  return {
    labels: points.map((p) => p.day),
    datasets: [
      {
        label: 'Morning',
        data: points.map((p) => p.morning),
        backgroundColor: SHIFT_COLORS.morning,
        borderRadius: BAR_RADIUS,
        borderSkipped: false,
        maxBarThickness: 18,
      },
      {
        label: 'Afternoon',
        data: points.map((p) => p.afternoon),
        backgroundColor: SHIFT_COLORS.afternoon,
        borderRadius: BAR_RADIUS,
        borderSkipped: false,
        maxBarThickness: 18,
      },
      {
        label: 'Evening',
        data: points.map((p) => p.evening),
        backgroundColor: SHIFT_COLORS.evening,
        borderRadius: BAR_RADIUS,
        borderSkipped: false,
        maxBarThickness: 18,
      },
      {
        label: 'Night',
        data: points.map((p) => p.night),
        backgroundColor: SHIFT_COLORS.night,
        borderRadius: BAR_RADIUS,
        borderSkipped: false,
        maxBarThickness: 18,
      },
    ],
  };
}

export function buildFootfallChartOptions(dataMax = 0): ChartOptions<'bar'> {
  const { max, stepSize } = footfallAxisScale(dataMax);

  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 4, right: 4, bottom: 4, left: 0 },
    },
    datasets: {
      bar: {
        categoryPercentage: 0.72,
        barPercentage: 0.9,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'var(--popover, #fff)',
        titleColor: 'var(--foreground, #0f172a)',
        bodyColor: 'var(--foreground, #0f172a)',
        borderColor: 'var(--border, #e2e8f0)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label} : ${ctx.parsed.y}`,
          labelColor: (ctx) => ({
            borderColor: String(ctx.dataset.backgroundColor),
            backgroundColor: String(ctx.dataset.backgroundColor),
          }),
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { size: 11 },
          color: 'var(--muted-foreground, #94a3b8)',
          padding: 4,
        },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        min: 0,
        max,
        border: { display: false },
        grid: {
          color: 'rgba(148, 163, 184, 0.22)',
          drawTicks: false,
        },
        ticks: {
          stepSize,
          maxTicksLimit: 6,
          font: { size: 11 },
          color: 'var(--muted-foreground, #94a3b8)',
          padding: 6,
          precision: 0,
        },
      },
    },
    interaction: { mode: 'index', axis: 'x', intersect: false },
  };
}

export function buildPeakHoursChartData(points: PeakHourPoint[]): ChartData<'line'> {
  return {
    labels: points.map((p) => p.hour),
    datasets: [
      {
        label: 'Check-ins',
        data: points.map((p) => p.checkIns),
        fill: true,
        tension: 0.35,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        pointRadius: 2,
      },
    ],
  };
}

export function buildPeakHoursChartOptions(dataMax = 0): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        suggestedMax: dataMax > 0 ? Math.ceil(dataMax * 1.15) : undefined,
        ticks: { precision: 0 },
      },
    },
  };
}

export interface ShiftMixItem {
  label: string;
  color: string;
  value: number;
}

function sumFootfallByShift(points: FootfallDayPoint[]) {
  return points.reduce(
    (acc, p) => ({
      morning: acc.morning + p.morning,
      afternoon: acc.afternoon + p.afternoon,
      evening: acc.evening + p.evening,
      night: acc.night + p.night,
    }),
    { morning: 0, afternoon: 0, evening: 0, night: 0 },
  );
}

export function buildShiftMixTotals(points: FootfallDayPoint[]): ShiftMixItem[] {
  const totals = sumFootfallByShift(points);
  const values = [totals.morning, totals.afternoon, totals.evening, totals.night];
  return FOOTFALL_SHIFT_LEGEND.map((item, i) => ({
    label: item.label,
    color: item.color,
    value: values[i],
  }));
}

export function buildShiftMixChartData(points: FootfallDayPoint[]): ChartData<'doughnut'> {
  const totals = sumFootfallByShift(points);
  const items = [
    { label: 'Morning', value: totals.morning, color: SHIFT_COLORS.morning },
    { label: 'Afternoon', value: totals.afternoon, color: SHIFT_COLORS.afternoon },
    { label: 'Evening', value: totals.evening, color: SHIFT_COLORS.evening },
    { label: 'Night', value: totals.night, color: SHIFT_COLORS.night },
  ].filter((item) => item.value > 0);

  return {
    labels: items.map((item) => item.label),
    datasets: [
      {
        data: items.map((item) => item.value),
        backgroundColor: items.map((item) => item.color),
        borderWidth: 0,
        spacing: 2,
        hoverOffset: 4,
      },
    ],
  };
}

export function buildShiftMixChartOptions(): ChartOptions<'doughnut'> {
  return {
    maintainAspectRatio: false,
    responsive: true,
    cutout: '62%',
    layout: { padding: 0 },
    elements: {
      arc: {
        borderWidth: 0,
        spacing: 2,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--popover, #fff)',
        titleColor: 'var(--foreground, #0f172a)',
        bodyColor: 'var(--foreground, #0f172a)',
        borderColor: 'var(--border, #e2e8f0)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const values = ctx.dataset.data as number[];
            const total = values.reduce((sum, v) => sum + v, 0);
            const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          },
        },
      },
    },
  };
}

export function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function activityDotClass(type: string): string {
  switch (type) {
    case 'check-in':
      return 'bg-emerald-500';
    case 'payment':
      return 'bg-violet-500';
    case 'enrollment':
      return 'bg-blue-500';
    default:
      return 'bg-amber-500';
  }
}
