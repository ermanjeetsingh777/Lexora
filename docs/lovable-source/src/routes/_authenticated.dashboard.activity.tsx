import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { recentActivity } from "@/lib/mock/data";
import { DashboardEmpty } from "@/components/dashboard/state-boundary";
import { useDashboardFilters } from "@/lib/store/dashboard-filters";
import { Activity, User, Cog, Search, Download, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/activity")({
  head: () => ({ meta: [{ title: "Activity · Dashboard — SmartLibrary" }] }),
  component: ActivityPage,
});

// Extend the base activity with a synthetic longer feed for depth
const EXTENDED = Array.from({ length: 26 }, (_, i) => {
  const base = recentActivity[i % recentActivity.length];
  const hoursAgo = i * 1.6;
  return {
    id: `evt_${i}`,
    actor: base.actor,
    action: base.action,
    target: base.target,
    time: hoursAgo < 1 ? `${Math.round(hoursAgo * 60)}m ago` : `${Math.round(hoursAgo)}h ago`,
    category: base.actor === "System" ? "System" : "User",
    severity: (["info", "info", "info", "warning", "success"] as const)[i % 5],
  };
});

const TABS = ["All", "User", "System"] as const;

function ActivityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const density = useDashboardFilters((s) => s.density);
  const compact = density === "compact";

  const filtered = useMemo(() => EXTENDED.filter((e) => {
    if (tab !== "All" && e.category !== tab) return false;
    if (q && !`${e.actor} ${e.action} ${e.target}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tab, q]);

  const users = new Set(EXTENDED.filter((e) => e.category === "User").map((e) => e.actor)).size;
  const systemEvents = EXTENDED.filter((e) => e.category === "System").length;

  return (
    <>
      <PageHeader
        eyebrow="Audit" title="Activity log"
        description="Full audit trail of every workspace action, filtered live."
        actions={<Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>}
      />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label="Events today" value={EXTENDED.length} icon={<Activity className="h-4 w-4" />} />
        <KpiCard index={1} label="Unique actors" value={users} icon={<User className="h-4 w-4" />} />
        <KpiCard index={2} label="System events" value={systemEvents} icon={<Cog className="h-4 w-4" />} />
        <KpiCard index={3} label="Warnings" value={EXTENDED.filter((e) => e.severity === "warning").length} />
      </section>
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-2 justify-between mb-4">
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 text-xs font-medium rounded-sm ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t}</button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action, target…" className="pl-8 h-8" />
          </div>
        </div>
        <ol className={`relative border-l pl-4 ${compact ? "space-y-1.5" : "space-y-4"}`}>
          {filtered.map((e) => (
            <li key={e.id} className="relative">
              <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${e.severity === "warning" ? "bg-warning" : e.severity === "success" ? "bg-success" : "bg-primary"}`} />
              <div className="flex items-start gap-3">
                <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{e.actor.split(" ").map((p) => p[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                <div className="flex-1 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{e.actor}</span>
                    <span className="text-muted-foreground">{e.action}</span>
                    <span className="font-mono text-xs">{e.target}</span>
                    <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                  </div>
                  <span className="label-mono mt-0.5">{e.time}</span>
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-2 -ml-4">
              <DashboardEmpty
                icon={<Inbox className="h-5 w-5" />}
                title="No matching events"
                description={q ? `Nothing matches "${q}" in ${tab}. Try a broader search.` : `No ${tab.toLowerCase()} activity yet — check back soon.`}
                action={(q || tab !== "All") ? (
                  <Button size="sm" variant="outline" onClick={() => { setQ(""); setTab("All"); }}>Clear filters</Button>
                ) : null}
              />
            </li>
          )}
        </ol>
      </GlassCard>
    </>
  );
}
