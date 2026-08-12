import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AreaTrend, BarCompare, OccupancyHeatmap, Donut } from "@/components/charts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  branches, members, notifications, occupancyHeatmap,
  recentActivity, revenueTrend, attendanceTrend,
} from "@/lib/mock/data";
import { ArrowRight, Building2, Users, Armchair, IndianRupee, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview — SmartLibrary" },
      { name: "description", content: "Real-time operational overview across institutions, branches and libraries." },
    ],
  }),
  component: DashboardOverview,
});

function DashboardOverview() {
  const heat = occupancyHeatmap();
  const rev = revenueTrend(30);
  const att = attendanceTrend(14);
  const activeMembers = members.filter((m) => m.status === "Active").length;

  const branchPerf = branches.slice(0, 6).map((b) => ({
    ...b,
    revenue: 80000 + Math.round(Math.random() * 220000),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Workspace · Live"
        title="Operational overview"
        description="Real-time signal across every institution, branch and library you operate."
        actions={
          <>
            <Button variant="outline" size="sm">Export</Button>
            <Button size="sm">
              New report <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label="Active members" value="12,480" delta={3.4} hint="vs last week" icon={<Users className="h-4 w-4" />} />
        <KpiCard index={1} label="Occupancy" value="78%" delta={1.8} hint="peak 92% · 5pm" icon={<Armchair className="h-4 w-4" />} />
        <KpiCard index={2} label="Revenue MTD" value="₹48.2L" delta={6.2} hint="₹12.4L renewals" icon={<IndianRupee className="h-4 w-4" />} />
        <KpiCard index={3} label="Branches live" value="20" delta={-0.4} hint="1 in maintenance" icon={<Building2 className="h-4 w-4" />} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader
            title="Revenue & renewals"
            description="Daily revenue across all branches — last 30 days."
            actions={<Button variant="ghost" size="sm" asChild><Link to="/dashboard/revenue">Open <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>}
          />
          <AreaTrend
            data={rev}
            keys={[
              { key: "revenue", label: "Revenue", color: "var(--chart-1)" },
              { key: "renewals", label: "Renewals", color: "var(--chart-2)" },
            ]}
            height={260}
          />
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Member status" description="Distribution by status" />
          <Donut
            data={[
              { name: "Active", value: activeMembers, color: "var(--chart-1)" },
              { name: "Inactive", value: members.filter((m) => m.status === "Inactive").length, color: "var(--chart-3)" },
              { name: "Suspended", value: members.filter((m) => m.status === "Suspended").length, color: "var(--chart-4)" },
            ]}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div><div className="label-mono">Total</div><div className="text-lg font-semibold tabular-nums">{members.length}</div></div>
            <div><div className="label-mono">Active</div><div className="text-lg font-semibold text-success tabular-nums">{activeMembers}</div></div>
            <div><div className="label-mono">Dues</div><div className="text-lg font-semibold text-destructive tabular-nums">₹{members.reduce((s, m) => s + m.feesOwed, 0).toLocaleString()}</div></div>
          </div>
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader title="Occupancy heatmap" description="Average occupancy by day & hour" />
          <OccupancyHeatmap {...heat} />
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Attendance trend" description="Present vs late · last 14 days" />
          <BarCompare
            data={att}
            keys={[
              { key: "present", label: "Present", color: "var(--chart-1)" },
              { key: "late", label: "Late", color: "var(--chart-4)" },
            ]}
            height={260}
          />
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader
            title="Branch performance"
            description="Top branches by occupancy this week"
            actions={<Button variant="ghost" size="sm" asChild><Link to="/institutions">All branches <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>}
          />
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-y label-mono">
                  <th className="px-5 py-2 font-medium">Branch</th>
                  <th className="px-2 py-2 font-medium">City</th>
                  <th className="px-2 py-2 font-medium text-right">Members</th>
                  <th className="px-2 py-2 font-medium text-right">Occupancy</th>
                  <th className="px-5 py-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {branchPerf.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/40">
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{b.name}</div>
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">{b.city}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{b.members.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${b.occupancy}%` }} />
                        </div>
                        <span className="tabular-nums font-mono text-xs">{b.occupancy}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">₹{b.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader
            title="Live activity"
            description="Real-time across all branches"
            actions={<span className="flex items-center gap-1.5 label-mono"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live</span>}
          />
          <ol className="space-y-3">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px]">{a.actor.split(" ").map((p) => p[0]).slice(0,2).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm">
                  <span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">{a.action}</span> <span className="font-mono text-xs">{a.target}</span>
                  <div className="label-mono mt-0.5">{a.time}</div>
                </div>
              </li>
            ))}
          </ol>
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5 md:col-span-2">
          <SectionHeader title="Subscriptions" description="Monthly recurring revenue trajectory" />
          <AreaTrend
            data={rev.map((r) => ({ date: r.date, mrr: Math.round(r.revenue * 0.55), arr: Math.round(r.revenue * 0.4) }))}
            keys={[
              { key: "mrr", label: "MRR", color: "var(--chart-2)" },
              { key: "arr", label: "ARR", color: "var(--chart-5)" },
            ]}
            height={220}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Notifications" description="Unread inbox" actions={<Bell className="h-4 w-4 text-muted-foreground" />} />
          <ul className="space-y-3">
            {notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="border-l-2 pl-3" style={{ borderColor: n.type === "destructive" ? "var(--destructive)" : n.type === "warning" ? "var(--warning)" : n.type === "success" ? "var(--success)" : "var(--primary)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{n.title}</div>
                  <StatusBadge status={n.channel} variant="muted" />
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <span className="label-mono">{n.timestamp}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>
    </>
  );
}
