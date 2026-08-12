import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { seatGridQuery, librariesQuery } from "@/lib/services";
import { SeatGrid, SeatLegend } from "@/components/seat-grid";
import { DEMO_LIBRARIES, DEMO_SEATS_BY_LIB, buildActivityFeed } from "@/lib/mock/seats-demo";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, Radio, Armchair, ArrowRightLeft, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/seats/monitoring")({
  head: () => ({ meta: [{ title: "Live monitoring — SmartLibrary" }] }),
  component: MonitoringPage,
});

function MonitoringPage() {
  const librariesQ = useQuery({ ...librariesQuery(), retry: false });
  const raw = librariesQ.data ?? [];
  const libs = raw.length ? raw : DEMO_LIBRARIES;
  const isDemo = raw.length === 0;
  const [libId, setLibId] = useState<string | undefined>();
  const activeLib = useMemo(() => libs.find((l: any) => l.id === libId) ?? libs[0], [libs, libId]);

  const [paused, setPaused] = useState(false);
  const q = useQuery({
    ...seatGridQuery(isDemo ? undefined : activeLib?.id),
    enabled: !isDemo,
    refetchInterval: !isDemo && !paused ? 5_000 : false,
    retry: false,
  });
  const seats: any[] = isDemo
    ? (DEMO_SEATS_BY_LIB[activeLib?.id] ?? DEMO_SEATS_BY_LIB.demo_lib_1)
    : (q.data?.seats ?? []);

  // Simulated live tick for demo — nudges "last update" counter
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(t);
  }, [paused]);

  const activity = useMemo(() => buildActivityFeed(seats, 14), [seats, tick]);

  const occ = seats.filter((s) => s.status === "occupied").length;
  const avail = seats.filter((s) => s.status === "available").length;
  const res = seats.filter((s) => s.status === "reserved").length;
  const total = seats.length;
  const util = total ? Math.round((occ / total) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Seats"
        title="Live monitoring"
        description="Real-time check-ins, releases and reservations across the floor."
        actions={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="secondary" className="text-[10px]">Demo data</Badge>}
            <span className={cn("flex items-center gap-1.5 label-mono text-xs", paused ? "text-muted-foreground" : "text-success")}>
              <Radio className={cn("h-3 w-3", !paused && "animate-pulse")} />
              {paused ? "Paused" : "Streaming · 5s"}
            </span>
            <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
              {paused ? <><Play className="h-3.5 w-3.5 mr-1.5" /> Resume</> : <><Pause className="h-3.5 w-3.5 mr-1.5" /> Pause</>}
            </Button>
          </div>
        }
      />

      {libs.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {libs.map((l: any) => (
            <Button
              key={l.id}
              size="sm"
              variant={activeLib?.id === l.id ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setLibId(l.id)}
            >
              {l.name}
            </Button>
          ))}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Utilization" value={`${util}%`} hint={`${occ}/${total}`} icon={<Armchair className="h-4 w-4" />} />
        <KpiCard label="Occupied" value={occ} hint="right now" />
        <KpiCard label="Available" value={avail} hint="open seats" />
        <KpiCard label="Reserved" value={res} hint="upcoming" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader
            title={activeLib?.name ?? "Floor plan"}
            actions={<SeatLegend />}
          />
          {!isDemo && q.isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : seats.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No seats configured.</div>
          ) : (
            <SeatGrid seats={seats} />
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader
            title="Live activity"
            actions={<span className="label-mono text-xs inline-flex items-center gap-1"><TimerReset className="h-3 w-3" /> {tick * 5}s</span>}
          />
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {activity.map((a, i) => (
              <li
                key={a.id}
                className="flex items-start gap-2.5 rounded-md border bg-muted/20 p-2.5 animate-in fade-in slide-in-from-top-1"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div className={cn(
                  "h-6 w-6 rounded-full grid place-items-center shrink-0 mt-0.5",
                  a.verb === "released" ? "bg-muted-foreground/15 text-muted-foreground" :
                  a.verb === "reserved" ? "bg-warning/15 text-warning" :
                  a.verb === "moved to" ? "bg-info/15 text-info" :
                  "bg-primary/15 text-primary"
                )}>
                  {a.verb === "moved to" ? <ArrowRightLeft className="h-3 w-3" /> : <Armchair className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.verb}</span>{" "}
                    <span className="font-mono text-[11px]">{a.seat}</span>
                  </div>
                  <div className="label-mono text-[10px] mt-0.5">Section {a.section} · {a.minutesAgo}m ago</div>
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>
    </>
  );
}
