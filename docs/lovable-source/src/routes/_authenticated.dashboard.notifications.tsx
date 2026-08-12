import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifications } from "@/lib/mock/data";
import { DashboardEmpty } from "@/components/dashboard/state-boundary";
import { useDashboardFilters } from "@/lib/store/dashboard-filters";
import { Bell, BellOff, Mail, MessageSquare, Smartphone, Search, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Dashboard — SmartLibrary" }] }),
  component: NotifPage,
});

const TABS = ["All", "Unread", "InApp", "Email", "SMS", "Push"] as const;
const typeColors = { info: "border-primary", success: "border-success", warning: "border-warning", destructive: "border-destructive" } as const;

function NotifPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const density = useDashboardFilters((s) => s.density);
  const compact = density === "compact";

  const filtered = useMemo(() => notifications.filter((n) => {
    if (tab === "Unread") return !n.read;
    if (tab !== "All" && n.channel !== tab) return false;
    if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tab, q]);

  const unread = notifications.filter((n) => !n.read).length;
  const byChannel = (c: string) => notifications.filter((n) => n.channel === c).length;

  return (
    <>
      <PageHeader
        eyebrow="Feed" title="Notifications"
        description="System, workspace and channel notifications in one place."
        actions={<Button size="sm" variant="outline"><CheckCheck className="h-4 w-4 mr-1" /> Mark all read</Button>}
      />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label="Unread" value={unread} icon={<Bell className="h-4 w-4" />} />
        <KpiCard index={1} label="In-app" value={byChannel("InApp")} icon={<MessageSquare className="h-4 w-4" />} />
        <KpiCard index={2} label="Email" value={byChannel("Email")} icon={<Mail className="h-4 w-4" />} />
        <KpiCard index={3} label="Push" value={byChannel("Push")} icon={<Smartphone className="h-4 w-4" />} />
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
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notifications…" className="pl-8 h-8" />
          </div>
        </div>
        <ul className="divide-y">
          {filtered.map((n) => (
            <li key={n.id} className={`flex items-start gap-3 ${compact ? "py-1.5" : "py-3"} border-l-2 pl-3 ${typeColors[n.type]}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  <StatusBadge status={n.channel} variant="muted" />
                </div>
                {!compact && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                <span className="label-mono mt-1 inline-block">{n.timestamp}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs">Dismiss</Button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-2">
              <DashboardEmpty
                icon={<BellOff className="h-5 w-5" />}
                title="No notifications match this view"
                description={q ? `Nothing matches "${q}" in ${tab}. Try clearing your search or switching tab.` : `You're all caught up on ${tab}.`}
                action={(q || tab !== "All") ? (
                  <Button size="sm" variant="outline" onClick={() => { setQ(""); setTab("All"); }}>Clear filters</Button>
                ) : null}
              />
            </li>
          )}
        </ul>
      </GlassCard>
    </>
  );
}
