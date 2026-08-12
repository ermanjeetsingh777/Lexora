import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AreaTrend, BarCompare, OccupancyHeatmap, Donut } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { attendanceTrend, occupancyHeatmap, revenueTrend, members, branches } from "@/lib/mock/data";
import { useDashboardFilters } from "@/lib/store/dashboard-filters";
import { Activity, TrendingUp, Users, IndianRupee, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — SmartLibrary" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const range = useDashboardFilters((s) => s.range);
  const rev = useMemo(() => revenueTrend(range), [range]);
  const att = useMemo(() => attendanceTrend(range), [range]);

  const totalRev = rev.reduce((s, r) => s + r.revenue, 0);
  const totalRenewals = rev.reduce((s, r) => s + r.renewals, 0);
  const avgPresent = Math.round(att.reduce((s, a) => s + a.present, 0) / att.length);
  const activeMembers = members.filter((m) => m.status === "Active").length;

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Cross-tenant analytics"
        description="Deep-dive into revenue, attendance and occupancy signals across the workspace."
        actions={<Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Export</Button>}
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label={`Revenue · ${range}d`} value={`₹${(totalRev / 100000).toFixed(1)}L`} delta={4.6} icon={<IndianRupee className="h-4 w-4" />} />
        <KpiCard index={1} label="Renewals" value={`₹${(totalRenewals / 100000).toFixed(1)}L`} delta={2.1} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard index={2} label="Avg attendance" value={avgPresent} delta={1.2} hint="present / day" icon={<Activity className="h-4 w-4" />} />
        <KpiCard index={3} label="Active members" value={activeMembers} delta={0.8} icon={<Users className="h-4 w-4" />} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5"><SectionHeader title="Revenue" description={`Daily revenue · last ${range} days`} />
          <AreaTrend data={rev} keys={[{ key: "revenue", label: "Revenue", color: "var(--chart-1)" }, { key: "renewals", label: "Renewals", color: "var(--chart-2)" }]} />
        </GlassCard>
        <GlassCard className="p-5"><SectionHeader title="Attendance" description="Present vs late" />
          <BarCompare data={att} keys={[{ key: "present", label: "Present", color: "var(--chart-1)" }, { key: "late", label: "Late", color: "var(--chart-4)" }]} />
        </GlassCard>
        <GlassCard className="p-5 lg:col-span-2"><SectionHeader title="Occupancy heatmap" description="Average occupancy by day & hour" />
          <OccupancyHeatmap {...occupancyHeatmap()} />
        </GlassCard>
        <GlassCard className="p-5"><SectionHeader title="Plan distribution" />
          <Donut data={[
            { name: "Monthly", value: 480, color: "var(--chart-1)" },
            { name: "Quarterly", value: 320, color: "var(--chart-2)" },
            { name: "Annual", value: 484, color: "var(--chart-3)" },
          ]} />
        </GlassCard>
        <GlassCard className="p-5"><SectionHeader title="Top branches" description="By members" />
          <ul className="space-y-2.5">
            {branches.slice(0, 6).map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{b.name}</span>
                <div className="h-1.5 w-32 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${b.occupancy}%` }} /></div>
                <span className="tabular-nums font-mono text-xs w-10 text-right">{b.occupancy}%</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>
    </>
  );
}
