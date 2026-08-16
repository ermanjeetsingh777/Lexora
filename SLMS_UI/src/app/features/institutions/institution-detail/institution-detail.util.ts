import type { ChartData, ChartOptions } from 'chart.js';

export interface RevenueDayPoint {
  date: string;
  revenue: number;
  renewals: number;
}

export interface AttendanceDayPoint {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export interface HeatmapCell {
  day: string;
  hour: number;
  value: number;
}

export interface OccupancyHeatmapModel {
  days: string[];
  hours: number[];
  cells: HeatmapCell[];
}

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP_HOURS = Array.from({ length: 12 }, (_, index) => 8 + index);

const CHART_PALETTE = {
  revenue: '#3b82f6',
  renewals: '#22c55e',
  occupancy: '#3b82f6',
  present: '#3b82f6',
  late: '#f59e0b',
  absent: '#94a3b8',
  active: '#3b82f6',
  inactive: '#94a3b8',
  suspended: '#f59e0b',
};

export function buildRevenueChartData(points: RevenueDayPoint[]): ChartData<'line'> {
  return {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Revenue',
        data: points.map((p) => p.revenue),
        fill: true,
        tension: 0.35,
        borderColor: CHART_PALETTE.revenue,
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: CHART_PALETTE.revenue,
      },
      {
        label: 'Renewals',
        data: points.map((p) => p.renewals),
        fill: true,
        tension: 0.35,
        borderColor: CHART_PALETTE.renewals,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: CHART_PALETTE.renewals,
      },
    ],
  };
}

export function buildOccupancyChartData(points: { date: string; value: number }[]): ChartData<'line'> {
  return {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Occupancy %',
        data: points.map((p) => p.value),
        fill: true,
        tension: 0.35,
        borderColor: CHART_PALETTE.occupancy,
        backgroundColor: 'rgba(59, 130, 246, 0.18)',
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: CHART_PALETTE.occupancy,
      },
    ],
  };
}

export function buildMemberMixChartData(mix: {
  active: number;
  inactive: number;
  suspended: number;
}): ChartData<'doughnut'> {
  return {
    labels: ['Active', 'Inactive', 'Suspended'],
    datasets: [
      {
        data: [mix.active, mix.inactive, mix.suspended],
        backgroundColor: [CHART_PALETTE.active, CHART_PALETTE.inactive, CHART_PALETTE.suspended],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6,
      },
    ],
  };
}

function formatRevenueAxis(value: number): string {
  return value >= 100_000
    ? `₹${(value / 100_000).toFixed(1)}L`
    : value >= 1_000
      ? `₹${(value / 1_000).toFixed(1)}k`
      : `₹${value}`;
}

function niceAxisMax(value: number): number {
  if (value <= 0) return 0;
  const padded = value * 1.05;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function baseLineChartOptions(
  formatY?: (value: number) => string,
  yScale?: { min?: number; max?: number; stepSize?: number },
): ChartOptions<'line'> {
  return {
    maintainAspectRatio: false,
    responsive: true,
    elements: {
      line: { borderWidth: 2, tension: 0.35 },
      point: { hitRadius: 10, hoverRadius: 5, radius: 0 },
    },
    layout: {
      padding: { top: 4, right: 8, bottom: 2, left: 0 },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        align: 'start',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 10,
          font: { size: 11 },
        },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxTicksLimit: 7,
          maxRotation: 0,
          autoSkip: true,
          font: { size: 10 },
          padding: 4,
        },
      },
      y: {
        beginAtZero: true,
        min: yScale?.min,
        max: yScale?.max,
        grace: yScale?.max != null ? undefined : '4%',
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.2)', drawTicks: false },
        ticks: {
          stepSize: yScale?.stepSize,
          maxTicksLimit: 5,
          autoSkip: true,
          padding: 6,
          font: { size: 10 },
          callback: (value) => (formatY ? formatY(Number(value)) : `${value}`),
        },
      },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  };
}

export function buildRevenueChartOptions(dataMax = 0): ChartOptions<'line'> {
  const axisMax = niceAxisMax(dataMax);
  const stepSize = axisMax > 0 ? axisMax / 4 : undefined;
  return baseLineChartOptions(
    formatRevenueAxis,
    axisMax > 0 ? { min: 0, max: axisMax, stepSize } : undefined,
  );
}

export function buildOccupancyChartOptions(dataMax = 0): ChartOptions<'line'> {
  const axisMax = dataMax > 0 ? Math.max(25, niceAxisMax(dataMax)) : 100;
  const stepSize = axisMax <= 25 ? 5 : axisMax <= 50 ? 10 : 25;
  return baseLineChartOptions(
    (value) => `${Math.round(value)}%`,
    { min: 0, max: axisMax, stepSize },
  );
}

export function buildMemberMixChartOptions(): ChartOptions<'doughnut'> {
  return {
    maintainAspectRatio: true,
    aspectRatio: 1,
    responsive: true,
    cutout: '68%',
    layout: {
      padding: 0,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  };
}

export function buildAttendanceChartData(points: AttendanceDayPoint[]): ChartData<'bar'> {
  return {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Present',
        data: points.map((p) => p.present),
        backgroundColor: CHART_PALETTE.present,
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
        borderSkipped: false,
        stack: 'attendance',
      },
      {
        label: 'Late',
        data: points.map((p) => p.late),
        backgroundColor: CHART_PALETTE.late,
        borderRadius: 0,
        borderSkipped: false,
        stack: 'attendance',
      },
      {
        label: 'Absent',
        data: points.map((p) => p.absent),
        backgroundColor: CHART_PALETTE.absent,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        stack: 'attendance',
      },
    ],
  };
}

export function buildAttendanceChartOptions(dataMax = 0): ChartOptions<'bar'> {
  const axisMax = niceAxisMax(dataMax);
  const stepSize = axisMax > 0 ? axisMax / 4 : undefined;

  return {
    maintainAspectRatio: false,
    responsive: true,
    datasets: {
      bar: {
        categoryPercentage: 0.65,
        barPercentage: 0.9,
      },
    },
    layout: {
      padding: { top: 4, right: 8, bottom: 2, left: 0 },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        align: 'start',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 10,
          font: { size: 11 },
        },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxTicksLimit: 7,
          maxRotation: 0,
          autoSkip: true,
          font: { size: 10 },
          padding: 4,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: axisMax > 0 ? axisMax : undefined,
        grace: axisMax > 0 ? undefined : '4%',
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.2)', drawTicks: false },
        ticks: {
          stepSize,
          maxTicksLimit: 5,
          autoSkip: true,
          padding: 6,
          font: { size: 10 },
          precision: 0,
        },
      },
    },
    interaction: { mode: 'index', axis: 'x', intersect: false },
  };
}

export function normalizeOccupancyHeatmap(raw: unknown): OccupancyHeatmapModel {
  if (!raw || typeof raw !== 'object') {
    return buildEmptyHeatmap();
  }

  const record = raw as Record<string, unknown>;
  const days = readStringArray(record, ['days', 'Days'], HEATMAP_DAYS);
  const hours = readNumberArray(record, ['hours', 'Hours'], HEATMAP_HOURS);
  const rawCells = readUnknownArray(record, ['cells', 'Cells', 'data', 'Data']);

  const cells = rawCells
    .map((cell) => normalizeHeatmapCell(cell))
    .filter((cell): cell is HeatmapCell => cell !== null);

  if (!cells.length && days.length && hours.length) {
    return {
      days,
      hours,
      cells: days.flatMap((day) =>
        hours.map((hour) => ({ day, hour, value: 0 })),
      ),
    };
  }

  return { days, hours, cells };
}

function buildEmptyHeatmap(): OccupancyHeatmapModel {
  return {
    days: HEATMAP_DAYS,
    hours: HEATMAP_HOURS,
    cells: HEATMAP_DAYS.flatMap((day) =>
      HEATMAP_HOURS.map((hour) => ({ day, hour, value: 0 })),
    ),
  };
}

function readStringArray(
  record: Record<string, unknown>,
  keys: string[],
  fallback: string[],
): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      return value as string[];
    }
  }
  return fallback;
}

function readNumberArray(
  record: Record<string, unknown>,
  keys: string[],
  fallback: number[],
): number[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }
  }
  return fallback;
}

function readUnknownArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function normalizeHeatmapCell(raw: unknown): HeatmapCell | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const cell = raw as Record<string, unknown>;
  const day = String(cell['day'] ?? cell['Day'] ?? '').trim();
  const hour = Number(cell['hour'] ?? cell['Hour']);
  const value = Number(cell['value'] ?? cell['Value'] ?? 0);

  if (!day || Number.isNaN(hour)) {
    return null;
  }

  return { day, hour, value: Number.isFinite(value) ? value : 0 };
}

export function heatmapCellColor(value: number): string {
  if (value <= 0) {
    return 'color-mix(in oklch, var(--muted) 70%, transparent)';
  }

  const opacity = Math.max(0.18, Math.min(0.95, value / 100));
  return `oklch(0.55 0.18 258 / ${opacity})`;
}

export function getHeatmapValue(
  cells: HeatmapCell[],
  day: string,
  hour: number,
): number {
  const match = cells.find(
    (cell) => cell.day.toLowerCase() === day.toLowerCase() && Number(cell.hour) === Number(hour),
  );
  return match?.value ?? 0;
}

export function memberMixColors(): Record<string, string> {
  return {
    Active: CHART_PALETTE.active,
    Inactive: CHART_PALETTE.inactive,
    Suspended: CHART_PALETTE.suspended,
  };
}
