import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { liveAttendanceQuery } from "@/lib/services";
import { buildDemoLiveFeed } from "@/lib/mock/attendance-demo";
import { Pause, Play, Search, LogIn, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance/live")({
  head: () => ({ meta: [{ title: "Live attendance — SmartLibrary" }] }),
  component: LivePage,
});

type Row = { id: string; name: string; seatNumber: string | null; shift: string; dir: "in" | "out"; time: string; ts?: number };

function LivePage() {
  const [paused, setPaused] = useState(false);
  const q = useQuery({ ...liveAttendanceQuery(14), refetchInterval: paused ? false : 10_000 });
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");
  const [tick, setTick] = useState(0);

  const rows: Row[] = useMemo(() => {
    const src: Row[] = (q.data as Row[])?.length ? (q.data as Row[]) : buildDemoLiveFeed(14);
    return src;
  }, [q.data, tick]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, [paused]);

  const filtered = rows.filter(r =>
    (filter === "all" || r.dir === filter) &&
    (search === "" || r.name.toLowerCase().includes(search.toLowerCase()))
  );

  const checkins = rows.filter(r => r.dir === "in").length;
  const checkouts = rows.filter(r => r.dir === "out").length;

  return (
    <>
      <PageHeader
        eyebrow="Attendance"
        title="Live check-ins"
        description="Real-time stream of check-ins and check-outs across all libraries."
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 label-mono">
              <span className={cn("h-1.5 w-1.5 rounded-full", paused ? "bg-muted-foreground" : "bg-success animate-pulse")} />
              {paused ? "Paused" : "Streaming"}
            </span>
            <Button size="sm" variant="outline" onClick={() => setPaused(p => !p)}>
              {paused ? <><Play className="h-4 w-4 mr-1" /> Resume</> : <><Pause className="h-4 w-4 mr-1" /> Pause</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTick(t => t + 1)}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Events (last window)" value={rows.length} />
        <KpiCard label="Check-ins" value={checkins} icon={<LogIn className="h-4 w-4" />} />
        <KpiCard label="Check-outs" value={checkouts} icon={<LogOut className="h-4 w-4" />} />
        <KpiCard label="Refresh" value={paused ? "Paused" : "10s"} hint="Auto polling" />
      </section>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <SectionHeader title="Activity stream" description={`${filtered.length} of ${rows.length} shown`} />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member" className="h-8 pl-8 w-48 text-xs" />
            </div>
            <div className="inline-flex rounded-md border bg-muted/40 p-1">
              {(["all", "in", "out"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn("px-2.5 py-1 text-xs rounded-md font-medium capitalize",
                    filter === f ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  {f === "in" ? "Check-ins" : f === "out" ? "Check-outs" : "All"}
                </button>
              ))}
            </div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No matching activity.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map(m => (
              <li key={m.id} className="flex items-center gap-3 py-3 animate-in fade-in-50">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{m.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">Seat {m.seatNumber ?? "—"} · {m.shift}</div>
                </div>
                <StatusBadge status={m.dir === "in" ? "Check-in" : "Check-out"} variant={m.dir === "in" ? "success" : "muted"} />
                <span className="label-mono w-16 text-right">{m.time}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
