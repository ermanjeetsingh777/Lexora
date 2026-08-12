import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { OccupancyHeatmap, BarCompare } from "@/components/charts";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { occupancyHeatmapQuery } from "@/lib/services";
import { DEMO_HEATMAP } from "@/lib/mock/seats-demo";
import { Flame, TrendingDown, TrendingUp, CalendarRange, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seats/heatmap")({
  head: () => ({ meta: [{ title: "Seat heatmap — SmartLibrary" }] }),
  component: HeatmapPage,
});

type RangeKey = "7d" | "30d" | "90d";

function HeatmapPage() {
  const q = useQuery({ ...occupancyHeatmapQuery(), retry: false });
  const backend = q.data;
  const isDemo = !backend || !backend.data?.length;
  const hm = isDemo ? DEMO_HEATMAP : backend;

  const [range, setRange] = useState<RangeKey>("30d");

  const stats = useMemo(() => {
    const values = hm.data.map((d) => d.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length));
    let peak = { day: "", hour: 0, value: 0 };
    let quiet = { day: "", hour: 0, value: 100 };
    for (const d of hm.data) {
      if (d.value > peak.value) peak = d;
      if (d.value < quiet.value) quiet = d;
    }
    // Per-day averages
    const byDay = hm.days.map((day) => {
      const vs = hm.data.filter((d) => d.day === day).map((d) => d.value);
      return { date: day, avg: Math.round(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)) };
    });
    // Per-hour averages
    const byHour = hm.hours.map((h) => {
      const vs = hm.data.filter((d) => d.hour === h).map((d) => d.value);
      return { date: `${String(h).padStart(2, "0")}h`, avg: Math.round(vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length)) };
    });
    return { avg, peak, quiet, byDay, byHour };
  }, [hm]);

  return (
    <>
      <PageHeader
        eyebrow="Seats"
        title="Utilization heatmap"
        description="Density of seat usage across days and hours."
        actions={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="secondary" className="text-[10px]">Demo data</Badge>}
            <div className="inline-flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              {(["7d","30d","90d"] as RangeKey[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2 py-0.5 text-[11px] rounded font-mono ${range === r ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5 mr-1.5" /> CSV</Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Average load" value={`${stats.avg}%`} hint={`window · ${range}`} />
        <KpiCard label="Peak" value={`${stats.peak.value}%`} hint={`${stats.peak.day} · ${String(stats.peak.hour).padStart(2,"0")}:00`} icon={<Flame className="h-4 w-4" />} />
        <KpiCard label="Quietest" value={`${stats.quiet.value}%`} hint={`${stats.quiet.day} · ${String(stats.quiet.hour).padStart(2,"0")}:00`} icon={<TrendingDown className="h-4 w-4" />} />
        <KpiCard label="Busy hours" value={hm.hours.filter((h) => {
          const vs = hm.data.filter((d) => d.hour === h).map((d) => d.value);
          return (vs.reduce((a,b)=>a+b,0) / Math.max(1,vs.length)) >= 70;
        }).length} hint="≥ 70% load" icon={<TrendingUp className="h-4 w-4" />} />
      </section>

      <GlassCard className="p-5">
        <SectionHeader
          title="Weekly utilization"
          actions={<span className="label-mono text-xs">day × hour · % of seats occupied</span>}
        />
        {!isDemo && q.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <OccupancyHeatmap {...hm} />
        )}
      </GlassCard>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <SectionHeader title="By day of week" />
          <BarCompare
            data={stats.byDay}
            keys={[{ key: "avg", label: "Avg load %", color: "var(--chart-1)" }]}
            height={200}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="By hour of day" />
          <BarCompare
            data={stats.byHour}
            keys={[{ key: "avg", label: "Avg load %", color: "var(--chart-2)" }]}
            height={200}
          />
        </GlassCard>
      </section>
    </>
  );
}
