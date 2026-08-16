export type TrendMetric = 'occupancy' | 'revenue';
export type TrendRangeDays = 7 | 14 | 30;
export type QuickViewLoadState = 'loading' | 'ready' | 'error';

export interface TrendPoint {
  date: string;
  value: number;
}

export interface AreaTrendSvgModel {
  area: string;
  line: string;
  gridLines: number[];
  xLabels: { x: number; text: string }[];
  yLabels: { y: number; text: string }[];
  plotPoints: TrendPlotPoint[];
  width: number;
  height: number;
  color: string;
}

export interface TrendPlotPoint {
  x: number;
  y: number;
  date: string;
  value: number;
  label: string;
}

export interface QuickViewActivityItem {
  occurredAtUtc: string;
  text: string;
  severity: 'info' | 'warn';
}

export function formatTrendValue(value: number, metric: TrendMetric): string {
  if (metric === 'revenue') {
    if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
    return `₹${value.toFixed(0)}`;
  }
  return `${value}%`;
}

export function buildAreaTrendSvg(
  points: TrendPoint[],
  metric: TrendMetric,
  width = 320,
  height = 180,
): AreaTrendSvgModel {
  const color = metric === 'revenue' ? 'var(--chart-2, var(--primary))' : 'var(--primary)';
  const padding = { top: 8, right: 8, bottom: 20, left: 40 };
  const empty: AreaTrendSvgModel = {
    area: '',
    line: '',
    gridLines: [],
    xLabels: [],
    yLabels: [],
    plotPoints: [],
    width,
    height,
    color,
  };

  if (!points.length) {
    return empty;
  }

  const values = points.map((p) => p.value);
  const dataMax = Math.max(...values);

  let min: number;
  let max: number;

  if (metric === 'occupancy') {
    min = 0;
    if (dataMax <= 0) {
      max = 100;
    } else {
      max = Math.min(100, Math.ceil(dataMax / 10) * 10);
      if (max <= dataMax) max = Math.min(100, max + 10);
    }
  } else {
    min = 0;
    max = dataMax <= 0 ? 1 : dataMax;
  }

  const range = max - min || 1;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const bottom = padding.top + innerH;

  const coords = points.map((p, i) => {
    const x = padding.left + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = padding.top + innerH - ((p.value - min) / range) * innerH;
    return { x, y, date: p.date, value: p.value };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${bottom} L ${coords[0].x.toFixed(1)} ${bottom} Z`;

  const gridLines = [0.25, 0.5, 0.75].map((t) => padding.top + innerH * (1 - t));

  const formatY = (v: number) => formatTrendValue(v, metric);

  const yLabels = [
    { y: padding.top + 4, text: formatY(max) },
    { y: padding.top + innerH / 2, text: formatY(min + range / 2) },
    { y: bottom - 2, text: formatY(min) },
  ];

  const xIndices =
    points.length <= 7
      ? points.map((_, i) => i)
      : [0, Math.floor(points.length / 2), points.length - 1];

  const xLabels = xIndices.map((i) => ({
    x: coords[i].x,
    text: coords[i].date,
  }));

  const plotPoints: TrendPlotPoint[] = coords.map((c) => ({
    x: c.x,
    y: c.y,
    date: c.date,
    value: c.value,
    label: `${c.date}: ${formatTrendValue(c.value, metric)}`,
  }));

  return { area, line, gridLines, xLabels, yLabels, plotPoints, width, height, color };
}

export function formatRelativeTime(isoUtc: string, now = new Date()): string {
  const then = new Date(isoUtc);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
