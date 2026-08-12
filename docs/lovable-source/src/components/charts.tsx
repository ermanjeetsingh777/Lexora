import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const axisTick = { fontSize: 11, fill: "var(--color-muted-foreground)" } as const;
const gridStroke = "var(--color-border)";

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
  boxShadow: "var(--shadow-elegant)",
} as const;

export function AreaTrend({
  data,
  keys,
  height = 240,
}: {
  data: any[];
  keys: { key: string; label: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          {keys.map((k) => (
            <linearGradient key={k.key} id={`g-${k.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={k.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={k.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-border)" }} />
        {keys.map((k) => (
          <Area
            key={k.key}
            type="monotone"
            dataKey={k.key}
            stroke={k.color}
            strokeWidth={2}
            fill={`url(#g-${k.key})`}
            name={k.label}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarCompare({
  data,
  keys,
  height = 240,
}: {
  data: any[];
  keys: { key: string; label: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => (
          <Bar key={k.key} dataKey={k.key} fill={k.color} name={k.label} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({
  data,
  keys,
  height = 220,
}: {
  data: any[];
  keys: { key: string; label: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} stroke={k.color} strokeWidth={2} dot={false} name={k.label} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Donut({
  data,
  height = 220,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="var(--color-background)">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function OccupancyHeatmap({
  days,
  hours,
  data,
}: {
  days: string[];
  hours: number[];
  data: { day: string; hour: number; value: number }[];
}) {
  const cell = (v: number) => {
    const opacity = Math.max(0.06, v / 100);
    return `oklch(0.55 0.18 258 / ${opacity})`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `60px repeat(${hours.length}, minmax(28px, 1fr))` }}
        >
          <div />
          {hours.map((h) => (
            <div key={h} className="label-mono text-center">{h}</div>
          ))}
          {days.map((day) => (
            <>
              <div key={day} className="label-mono self-center pr-1 text-right">{day}</div>
              {hours.map((h) => {
                const d = data.find((x) => x.day === day && x.hour === h);
                const v = d?.value ?? 0;
                return (
                  <div
                    key={`${day}-${h}`}
                    className="h-7 rounded-sm border border-border/40"
                    style={{ background: cell(v) }}
                    title={`${day} ${h}:00 — ${v}%`}
                  />
                );
              })}
            </>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 label-mono">
          <span>Less</span>
          {[10, 30, 50, 70, 95].map((v) => (
            <span key={v} className="h-3 w-6 rounded-sm" style={{ background: cell(v) }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
