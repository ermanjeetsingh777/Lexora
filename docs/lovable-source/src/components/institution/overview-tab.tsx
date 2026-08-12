import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { institutionDetailQuery } from "@/lib/services";
import { GlassCard, SectionHeader, EmptyState } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AreaTrend, BarCompare, Donut, OccupancyHeatmap } from "@/components/charts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Activity, IndianRupee, Library as LibraryIcon, AlertTriangle, Plus } from "lucide-react";
import { revenueTrend, attendanceTrend, occupancyTrend, occupancyHeatmap } from "@/lib/mock/data";

export function OverviewTab({ institutionId }: { institutionId: string }) {
  const { data } = useSuspenseQuery(institutionDetailQuery(institutionId));
  const { institution: inst, kpis } = data;

  if (kpis.branchCount === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-5 w-5" />}
        title="No branches yet"
        description="Add your first branch to start tracking occupancy, members, and revenue."
        action={
          <Button asChild size="sm">
            <Link to="/institutions/$institutionId" params={{ institutionId }} search={{ tab: "branches" } as any}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add branch
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Branches" value={kpis.branchCount} icon={<Building2 className="h-4 w-4" />} hint="active" index={0} />
        <KpiCard label="Libraries" value={kpis.libraryCount} icon={<LibraryIcon className="h-4 w-4" />} hint="across branches" index={1} />
        <KpiCard label="Members" value={kpis.memberCount.toLocaleString()} icon={<Users className="h-4 w-4" />} hint="enrolled" index={2} />
        <KpiCard label="Occupancy" value={`${kpis.occupancyPct}%`} icon={<Activity className="h-4 w-4" />} hint={`${kpis.occupied}/${kpis.seatCapacity} seats`} index={3} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionHeader title="Revenue · 30 days" description="Daily revenue and renewals" />
          <AreaTrend
            data={revenueTrend(30)}
            keys={[
              { key: "revenue", label: "Revenue", color: "var(--chart-1)" },
              { key: "renewals", label: "Renewals", color: "var(--chart-2)" },
            ]}
            height={240}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Member mix" />
          <Donut
            data={[
              { name: "Active", value: Math.max(1, Math.round(kpis.memberCount * 0.78)), color: "var(--chart-1)" },
              { name: "Inactive", value: Math.max(1, Math.round(kpis.memberCount * 0.16)), color: "var(--chart-3)" },
              { name: "Suspended", value: Math.max(1, Math.round(kpis.memberCount * 0.06)), color: "var(--chart-4)" },
            ]}
            height={220}
          />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionHeader title="Occupancy trend · 30 days" description="Average daily occupancy across branches" />
          <AreaTrend
            data={occupancyTrend(30)}
            keys={[{ key: "occupancy", label: "Occupancy %", color: "var(--chart-1)" }]}
            height={240}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Capacity utilization" />
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tabular-nums">{kpis.occupancyPct}%</p>
                <p className="label-mono">{kpis.occupied.toLocaleString()} / {kpis.seatCapacity.toLocaleString()} seats</p>
              </div>
              <Badge variant={kpis.occupancyPct > 85 ? "destructive" : kpis.occupancyPct > 60 ? "default" : "secondary"}>
                {kpis.occupancyPct > 85 ? "Tight" : kpis.occupancyPct > 60 ? "Healthy" : "Slack"}
              </Badge>
            </div>
            <Progress value={kpis.occupancyPct} />
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div><p className="text-sm font-semibold tabular-nums">{kpis.libraryCount}</p><p className="label-mono">Libraries</p></div>
              <div><p className="text-sm font-semibold tabular-nums">{kpis.memberCount}</p><p className="label-mono">Members</p></div>
              <div><p className="text-sm font-semibold tabular-nums">{kpis.seatCapacity}</p><p className="label-mono">Seats</p></div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionHeader title="Attendance · 14 days" description="Present, late and absent" />
          <BarCompare
            data={attendanceTrend(14)}
            keys={[
              { key: "present", label: "Present", color: "var(--chart-1)" },
              { key: "late", label: "Late", color: "var(--chart-4)" },
              { key: "absent", label: "Absent", color: "var(--chart-3)" },
            ]}
            height={220}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Weekly heatmap" description="Hourly occupancy" />
          <OccupancyHeatmap {...occupancyHeatmap()} />
        </GlassCard>
      </div>

      {kpis.libraryCount === 0 && (
        <GlassCard className="p-5 border-dashed">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-chart-4 mt-0.5" />
              <div>
                <p className="text-sm font-medium">No libraries set up yet</p>
                <p className="label-mono mt-0.5">{inst.name} has branches but no libraries — add one to start tracking seats.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/institutions/$institutionId" params={{ institutionId }} search={{ tab: "libraries" } as any}>
                Manage libraries
              </Link>
            </Button>
          </div>
        </GlassCard>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
        <IndianRupee className="h-3 w-3" /> Revenue and attendance charts use sample trend data; KPI counts are live.
      </div>
    </div>
  );
}
