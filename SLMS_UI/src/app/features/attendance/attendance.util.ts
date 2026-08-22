import type { ChartData, ChartOptions } from 'chart.js';
import {
  AttendanceHourlyCheckIn,
  AttendanceShiftMixItem,
  AttendanceTrendDay,
} from '@core/models/attendanceModels';

const CHART_PRESENT = 'oklch(0.62 0.18 258)';
const CHART_ABSENT = 'oklch(0.72 0.04 250)';
const CHART_LATE = 'oklch(0.72 0.16 55)';
const CHART_HOURLY = 'oklch(0.68 0.14 190)';

const SHIFT_COLORS: Record<string, string> = {
  Morning: 'oklch(0.78 0.13 80)',
  Afternoon: 'oklch(0.65 0.17 258)',
  Evening: 'oklch(0.62 0.18 320)',
  Night: 'oklch(0.55 0.12 230)',
  Unassigned: 'oklch(0.70 0.03 250)',
};

function niceAxisMax(value: number): number {
  if (value <= 0) return 10;
  if (value <= 10) return Math.ceil(value);
  if (value <= 50) return Math.ceil(value / 10) * 10;
  return Math.ceil(value / 20) * 20;
}

export function buildAttendanceTrendBarData(points: AttendanceTrendDay[]): ChartData<'bar'> {
  return {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: 'Present',
        data: points.map((p) => p.present),
        backgroundColor: CHART_PRESENT,
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
        borderSkipped: false,
        stack: 'attendance',
      },
      {
        label: 'Absent',
        data: points.map((p) => p.absent),
        backgroundColor: CHART_ABSENT,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        stack: 'attendance',
      },
    ],
  };
}

export function buildAttendanceTrendBarOptions(points: AttendanceTrendDay[]): ChartOptions<'bar'> {
  const max = niceAxisMax(Math.max(0, ...points.flatMap((p) => [p.present + p.absent])));
  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false } },
      y: {
        stacked: true,
        beginAtZero: true,
        max: max > 0 ? max : undefined,
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
        ticks: { precision: 0 },
      },
    },
  };
}

export function buildAttendanceLateAreaData(points: AttendanceTrendDay[]): ChartData<'line'> {
  return {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: 'Late',
        data: points.map((p) => p.late),
        fill: true,
        tension: 0.35,
        borderColor: CHART_LATE,
        backgroundColor: 'color-mix(in oklch, oklch(0.72 0.16 55) 18%, transparent)',
        pointRadius: 0,
        pointHoverRadius: 3,
      },
    ],
  };
}

export function buildAttendanceLateAreaOptions(points: AttendanceTrendDay[]): ChartOptions<'line'> {
  const max = Math.max(1, ...points.map((p) => p.late));
  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        suggestedMax: Math.ceil(max * 1.2),
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
        ticks: { precision: 0 },
      },
    },
  };
}

export function buildAttendanceHourlyBarData(points: AttendanceHourlyCheckIn[]): ChartData<'bar'> {
  return {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: 'Check-ins',
        data: points.map((p) => p.checkIns),
        backgroundColor: CHART_HOURLY,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };
}

export function buildAttendanceHourlyBarOptions(points: AttendanceHourlyCheckIn[]): ChartOptions<'bar'> {
  const max = niceAxisMax(Math.max(0, ...points.map((p) => p.checkIns)));
  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
      y: {
        beginAtZero: true,
        max: max > 0 ? max : undefined,
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
        ticks: { precision: 0 },
      },
    },
  };
}

export function buildAttendanceShiftMixData(items: AttendanceShiftMixItem[]): ChartData<'doughnut'> {
  return {
    labels: items.map((i) => i.shift),
    datasets: [
      {
        data: items.map((i) => i.count),
        backgroundColor: items.map((i) => SHIFT_COLORS[i.shift] ?? SHIFT_COLORS['Unassigned']),
        borderWidth: 0,
      },
    ],
  };
}

export const attendanceShiftMixChartOptions: ChartOptions<'doughnut'> = {
  maintainAspectRatio: false,
  responsive: true,
  cutout: '62%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
      },
    },
  },
};

export function shiftMixLegend(items: AttendanceShiftMixItem[]) {
  return items.map((item) => ({
    label: item.shift,
    value: item.count,
    color: SHIFT_COLORS[item.shift] ?? SHIFT_COLORS['Unassigned'],
  }));
}
