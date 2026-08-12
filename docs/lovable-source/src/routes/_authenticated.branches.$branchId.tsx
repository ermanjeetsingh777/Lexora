import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useParams, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, GlassCard, SectionHeader, EmptyState } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, MapPin, Users, Activity, AlertTriangle, Clock, Phone, Mail,
  BookOpen, ShieldCheck, UserCog, Footprints,
} from "lucide-react";
import { AreaTrend, BarCompare, LineTrend, Donut, OccupancyHeatmap } from "@/components/charts";
import {
  getBranchDetail, getBranchOccupancySeries, getBranchFootfallSeries,
  getBranchPeakHours, getBranchHeatmap, getBranchStaff, getBranchActivity,
  getBranchLibraries,
} from "@/lib/mock/branch-detail";

type Tab = "overview" | "usage" | "libraries" | "staffing" | "activity";
type ActivityFilter = "all" | "check-in" | "booking" | "alert" | "payment";

type DetailSearch = { tab?: Tab; af?: ActivityFilter };
const TABS = new Set(["overview", "usage", "libraries", "staffing", "activity"]);
const AFS = new Set(["all", "check-in", "booking", "alert", "payment"]);

export const Route = createFileRoute("/_authenticated/branches/$branchId")({
  head: ({ params }) => ({ meta: [{ title: `Branch · ${params.branchId.slice(0, 8)} — SmartLibrary` }] }),
  validateSearch: (s: Record<string, unknown>): DetailSearch => {
    const out: DetailSearch = {};
    if (typeof s.tab === "string" && TABS.has(s.tab)) out.tab = s.tab as Tab;
    if (typeof s.af === "string" && AFS.has(s.af)) out.af = s.af as ActivityFilter;
    return out;
  },
  component: Page,
});

function Page() {
  const { branchId } = useParams({ from: "/_authenticated/branches/$branchId" });
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;
  const tab: Tab = (search.tab as Tab) ?? "overview";

  const detail = useMemo(() => getBranchDetail(branchId), [branchId]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 240);
    return () => clearTimeout(t);
  }, [branchId, tab]);

  if (!detail) {
    return (
      <>
        <PageHeader
          eyebrow={(<Link to="/branches" className="inline-flex items-center label-mono hover:text-foreground"><ArrowLeft className="h-3 w-3 mr-1" />Branches</Link>) as any}
          title="Branch not found"
          description="That branch doesn't exist or you don't have access."
        />
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="No such branch"
          description="It may have been removed. Return to the branches list."
          action={<Button asChild size="sm"><Link to="/branches">Back to branches</Link></Button>}
        />
      </>
    );
  }

  const setTab = (v: Tab) =>
    navigate({ to: "/branches/$branchId", params: { branchId }, search: (p: DetailSearch) => ({ ...p, tab: v === "overview" ? undefined : v }), replace: true });

  return (
    <>
      <PageHeader
        eyebrow={(<Link to="/branches" className="inline-flex items-center label-mono hover:text-foreground"><ArrowLeft className="h-3 w-3 mr-1" />Branches</Link>) as any}
        title={detail.name}
        description={`${detail.institutionName} · ${detail.city} · Manager ${detail.manager}`}
        actions={
          <>
            <Badge variant={detail.status === "Active" ? "default" : detail.status === "Maintenance" ? "secondary" : "destructive"}>{detail.status}</Badge>
            <Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5 mr-1" />Email</Button>
            <Button size="sm"><Phone className="h-3.5 w-3.5 mr-1" />Call</Button>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Capacity" value={detail.capacity.toLocaleString()} icon={<Users className="h-4 w-4" />} hint="seats" index={0} />
        <KpiCard label="Occupancy" value={`${detail.occupancyPct}%`} icon={<Activity className="h-4 w-4" />} hint={`${detail.occupancy} live`} index={1} />
        <KpiCard label="Members" value={detail.members} icon={<UserCog className="h-4 w-4" />} hint="active" index={2} />
        <KpiCard label="Avg footfall" value={detail.avgFootfall} icon={<Footprints className="h-4 w-4" />} hint="per day" index={3} />
        <KpiCard label="Open tickets" value={detail.openTickets} icon={<AlertTriangle className="h-4 w-4" />} hint="last 7d" index={4} />
      </section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="libraries">Libraries</TabsTrigger>
          <TabsTrigger value="staffing">Staffing</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? <TabSkeleton /> : <OverviewTab branchId={branchId} detail={detail} />}
        </TabsContent>
        <TabsContent value="usage" className="space-y-4">
          {loading ? <TabSkeleton /> : <UsageTab branchId={branchId} />}
        </TabsContent>
        <TabsContent value="libraries" className="space-y-4">
          {loading ? <TabSkeleton /> : <LibrariesTab branchId={branchId} />}
        </TabsContent>
        <TabsContent value="staffing" className="space-y-4">
          {loading ? <TabSkeleton /> : <StaffingTab branchId={branchId} />}
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          {loading ? <TabSkeleton /> : <ActivityTab branchId={branchId} />}
        </TabsContent>
      </Tabs>
    </>
  );
}

function TabSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-5 lg:col-span-2"><Skeleton className="h-[240px] w-full" /></GlassCard>
      <GlassCard className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </GlassCard>
    </div>
  );
}

function OverviewTab({ branchId, detail }: { branchId: string; detail: ReturnType<typeof getBranchDetail> & object }) {
  const occ = useMemo(() => getBranchOccupancySeries(branchId, 14), [branchId]);
  const foot = useMemo(() => getBranchFootfallSeries(branchId), [branchId]);
  const acts = useMemo(() => getBranchActivity(branchId).slice(0, 8), [branchId]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-5 lg:col-span-2">
        <SectionHeader title="14-day occupancy" description="Rolling daily average" />
        <AreaTrend data={occ} keys={[{ key: "occupancy", label: "Occupancy %", color: "oklch(0.62 0.18 258)" }]} />
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title="Branch info" />
        <dl className="space-y-2.5 text-sm">
          <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={detail.address} />
          <Row icon={<Clock className="h-3.5 w-3.5" />} label="Hours" value={`${detail.hoursStart}–${detail.hoursEnd}`} />
          <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={detail.email} />
          <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={detail.phone} />
          <Row icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Manager" value={detail.manager} />
        </dl>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-2">
        <SectionHeader title="Footfall by shift" description="Mon–Sun, stacked" />
        <BarCompare data={foot} keys={[
          { key: "morning", label: "Morning", color: "oklch(0.78 0.13 80)" },
          { key: "afternoon", label: "Afternoon", color: "oklch(0.65 0.17 258)" },
          { key: "evening", label: "Evening", color: "oklch(0.62 0.18 320)" },
          { key: "night", label: "Night", color: "oklch(0.55 0.12 230)" },
        ]} />
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title="Recent activity" />
        <ul className="space-y-2.5">
          {acts.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-sm">
              <ActivityDot type={a.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate"><span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">· {a.detail}</span></p>
                <p className="label-mono">{a.type} · {a.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

function UsageTab({ branchId }: { branchId: string }) {
  const heat = useMemo(() => getBranchHeatmap(branchId), [branchId]);
  const peak = useMemo(() => getBranchPeakHours(branchId), [branchId]);
  const foot = useMemo(() => getBranchFootfallSeries(branchId), [branchId]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-5 lg:col-span-3">
        <SectionHeader title="Weekly heatmap" description="Occupancy % by day & hour" />
        <OccupancyHeatmap days={heat.days} hours={heat.hours} data={heat.data} />
      </GlassCard>
      <GlassCard className="p-5 lg:col-span-2">
        <SectionHeader title="Peak hours today" description="Check-ins per hour" />
        <LineTrend data={peak} keys={[{ key: "checkins", label: "Check-ins", color: "oklch(0.65 0.17 258)" }]} />
      </GlassCard>
      <GlassCard className="p-5">
        <SectionHeader title="Shift mix" description="Avg footfall" />
        <Donut data={[
          { name: "Morning", value: foot.reduce((s, x) => s + x.morning, 0), color: "oklch(0.78 0.13 80)" },
          { name: "Afternoon", value: foot.reduce((s, x) => s + x.afternoon, 0), color: "oklch(0.65 0.17 258)" },
          { name: "Evening", value: foot.reduce((s, x) => s + x.evening, 0), color: "oklch(0.62 0.18 320)" },
          { name: "Night", value: foot.reduce((s, x) => s + x.night, 0), color: "oklch(0.55 0.12 230)" },
        ]} />
      </GlassCard>
    </div>
  );
}

function LibrariesTab({ branchId }: { branchId: string }) {
  const libs = useMemo(() => getBranchLibraries(branchId), [branchId]);
  if (libs.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        title="No libraries yet"
        description="Add libraries to organize seats and resources within this branch."
        action={<Button size="sm">Add library</Button>}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {libs.map((l) => (
        <Link key={l.id} to="/libraries/$libraryId" params={{ libraryId: l.id }}>
          <GlassCard className="p-4 hover-lift">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="label-mono mt-0.5">Floor {l.floor} · {l.capacity} seats</p>
              </div>
              <Badge variant="secondary" className="tabular-nums">{l.occupied}/{l.capacity}</Badge>
            </div>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
}

function StaffingTab({ branchId }: { branchId: string }) {
  const staff = useMemo(() => getBranchStaff(branchId), [branchId]);
  const onDuty = staff.filter((s) => s.onDuty).length;
  const byShift = ["Morning", "Afternoon", "Evening", "Night"].map((shift, i) => ({
    name: shift,
    value: staff.filter((s) => s.shift === shift).length,
    color: ["oklch(0.78 0.13 80)", "oklch(0.65 0.17 258)", "oklch(0.62 0.18 320)", "oklch(0.55 0.12 230)"][i],
  }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <GlassCard className="p-0 overflow-hidden lg:col-span-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b label-mono bg-muted/30">
              <th className="py-2 px-3">Name</th>
              <th className="px-3">Role</th>
              <th className="px-3">Shift</th>
              <th className="px-3">Phone</th>
              <th className="px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-muted/40">
                <td className="py-2.5 px-3 font-medium">{s.name}</td>
                <td className="px-3 text-muted-foreground">{s.role}</td>
                <td className="px-3">{s.shift}</td>
                <td className="px-3 tabular-nums text-xs">{s.phone}</td>
                <td className="px-3">
                  <Badge variant={s.onDuty ? "default" : "secondary"}>{s.onDuty ? "On duty" : "Off"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
      <div className="space-y-4">
        <GlassCard className="p-5">
          <SectionHeader title="On duty now" />
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-semibold tabular-nums">{onDuty}</p>
            <p className="text-sm text-muted-foreground">of {staff.length}</p>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Shift coverage" />
          <Donut data={byShift} />
        </GlassCard>
      </div>
    </div>
  );
}

function ActivityTab({ branchId }: { branchId: string }) {
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;
  const af: ActivityFilter = search.af ?? "all";
  const all = useMemo(() => getBranchActivity(branchId), [branchId]);
  const filtered = af === "all" ? all : all.filter((a) => a.type === af);
  const setAf = (v: ActivityFilter) =>
    navigate({ to: "/branches/$branchId", params: { branchId }, search: (p: DetailSearch) => ({ ...p, af: v === "all" ? undefined : v }), replace: true });

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {(["all", "check-in", "booking", "alert", "payment"] as ActivityFilter[]).map((t) => (
          <Badge key={t} variant={af === t ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setAf(t)}>
            {t}
          </Badge>
        ))}
        <span className="ml-auto label-mono">{filtered.length} events</span>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events match this filter.</p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-sm border-b last:border-0 pb-2.5">
              <ActivityDot type={a.type} />
              <div className="min-w-0 flex-1">
                <p><span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">· {a.detail}</span></p>
                <p className="label-mono">{a.type} · {a.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="label-mono">{label}</p>
        <p className="truncate">{value}</p>
      </div>
    </div>
  );
}

function ActivityDot({ type }: { type: string }) {
  const color =
    type === "check-in" ? "bg-emerald-500" :
    type === "booking" ? "bg-blue-500" :
    type === "alert" ? "bg-amber-500" :
    "bg-violet-500";
  return <span className={`mt-1.5 h-2 w-2 rounded-full ${color}`} />;
}
