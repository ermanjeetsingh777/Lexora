import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { OccupancyHeatmap, AreaTrend } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { occupancyHeatmap, occupancyTrend, branches } from "@/lib/mock/data";
import { useDashboardFilters } from "@/lib/store/dashboard-filters";
import { Armchair, TrendingUp, Clock, Building2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/occupancy")({
  head: () => ({ meta: [{ title: "Occupancy — SmartLibrary" }] }),
  component: OccupancyPage,
});

function OccupancyPage() {
  const range = useDashboardFilters((s) => s.range);
  const heat = useMemo(() => occupancyHeatmap(), []);
  const trend = useMemo(() => occupancyTrend(range), [range]);

  const avg = Math.round(trend.reduce((s, t) => s + t.occupancy, 0) / trend.length);
  const peakDay = trend.reduce((a, b) => (a.occupancy > b.occupancy ? a : b));
  const peakHour = heat.data.reduce((a, b) => (a.value > b.value ? a : b));
  const highest = [...branches].sort((a, b) => b.occupancy - a.occupancy).slice(0, 5);
  const lowest = [...branches].sort((a, b) => a.occupancy - b.occupancy).slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Occupancy"
        title="Seat utilization"
        description="Where the workspace is running hot — and where it isn't."
        actions={<Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Export</Button>}
      />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label={`Avg occupancy · ${range}d`} value={`${avg}%`} delta={1.6} icon={<Armchair className="h-4 w-4" />} />
        <KpiCard index={1} label="Peak day" value={`${peakDay.occupancy}%`} hint={peakDay.date} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard index={2} label="Peak hour" value={`${peakHour.value}%`} hint={`${peakHour.day} · ${peakHour.hour}:00`} icon={<Clock className="h-4 w-4" />} />
        <KpiCard index={3} label="Branches tracked" value={branches.length} icon={<Building2 className="h-4 w-4" />} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2"><SectionHeader title={`Occupancy · ${range} days`} />
          <AreaTrend data={trend} keys={[{ key: "occupancy", label: "Occupancy %", color: "var(--chart-2)" }]} />
        </GlassCard>
        <GlassCard className="p-5"><SectionHeader title="Hottest branches" />
          <ul className="space-y-2.5">
            {highest.map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{b.name}</span>
                <span className="tabular-nums font-mono text-xs text-success">{b.occupancy}%</span>
              </li>
            ))}
          </ul>
          <div className="my-4 border-t" />
          <SectionHeader title="Underutilized" />
          <ul className="space-y-2.5">
            {lowest.map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{b.name}</span>
                <span className="tabular-nums font-mono text-xs text-muted-foreground">{b.occupancy}%</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>
      <GlassCard className="p-5"><SectionHeader title="Weekly heatmap" description="Average occupancy by day & hour" />
        <OccupancyHeatmap {...heat} />
      </GlassCard>
    </>
  );
}
