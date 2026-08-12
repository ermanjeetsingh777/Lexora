import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { SeatGrid, SeatLegend } from "@/components/seat-grid";
import { Donut, BarCompare } from "@/components/charts";
import { seatGridQuery, attendanceTrendQuery, librariesQuery, occupancyHeatmapQuery } from "@/lib/services";
import { generateSeats } from "@/lib/mock/data";
import { Armchair, Search, RefreshCw, LayoutGrid, Activity, Flame, TrendingUp, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/seats/")({
  head: () => ({ meta: [{ title: "Seats — SmartLibrary" }] }),
  component: SeatsOverview,
});

type StatusFilter = "all" | "occupied" | "available" | "reserved" | "maintenance";

const STATUS_META: Record<Exclude<StatusFilter, "all">, { label: string; dot: string; text: string }> = {
  occupied: { label: "Occupied", dot: "bg-primary", text: "text-primary" },
  available: { label: "Available", dot: "bg-muted-foreground/60", text: "text-muted-foreground" },
  reserved: { label: "Reserved", dot: "bg-warning", text: "text-warning" },
  maintenance: { label: "Maintenance", dot: "bg-destructive", text: "text-destructive" },
};

// Fallback demo data — used when backend queries fail (unauth) or return empty.
const DEMO_LIBS = [
  { id: "demo_lib_1", name: "Central Reading Hall" },
  { id: "demo_lib_2", name: "West Wing Study" },
  { id: "demo_lib_3", name: "Silent Zone" },
];
const DEMO_SEATS_BY_LIB: Record<string, any[]> = {
  demo_lib_1: generateSeats(1, 80),
  demo_lib_2: generateSeats(2, 60),
  demo_lib_3: generateSeats(3, 40),
};
const DEMO_ATT = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (13 - i));
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const present = Math.round((weekend ? 90 : 160) + Math.sin(i / 2) * 20);
  return { date: d.toISOString().slice(5, 10), present, late: Math.round(present * 0.08), absent: Math.max(0, 200 - present) };
});
const DEMO_HEAT = (() => {
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);
  const data: { day: string; hour: number; value: number }[] = [];
  ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach((day, di) => {
    hours.forEach((h, hi) => {
      const peak = 1 - Math.abs(hi - 6) / 8;
      const weekend = di >= 5 ? 0.6 : 1;
      data.push({ day, hour: h, value: Math.max(0, Math.min(100, Math.round(peak * weekend * 85 - ((di+hi)%7)*2))) });
    });
  });
  return { days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], hours, data };
})();

function SeatsOverview() {
  const librariesQ = useQuery({ ...librariesQuery(), retry: false });
  const rawLibs = librariesQ.data ?? [];
  const libs = rawLibs.length ? rawLibs : DEMO_LIBS;
  const isDemo = rawLibs.length === 0;

  const [libId, setLibId] = useState<string | undefined>();
  const activeLib = useMemo(() => libs.find((l: any) => l.id === libId) ?? libs[0], [libs, libId]);

  const seatsQ = useQuery({
    ...seatGridQuery(isDemo ? undefined : activeLib?.id),
    enabled: !isDemo,
    refetchInterval: isDemo ? false : 15_000,
    retry: false,
  });
  const attQ = useQuery({ ...attendanceTrendQuery(14), enabled: !isDemo, retry: false });
  const heatQ = useQuery({ ...occupancyHeatmapQuery(), enabled: !isDemo, retry: false });

  const seats: any[] = isDemo
    ? (DEMO_SEATS_BY_LIB[activeLib?.id] ?? DEMO_SEATS_BY_LIB.demo_lib_1)
    : (seatsQ.data?.seats ?? []);
  const att = isDemo ? DEMO_ATT : (attQ.data ?? []);
  const heatData = isDemo ? DEMO_HEAT : (heatQ.data ?? { days: [], hours: [], data: [] });

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const occ = seats.filter((s) => s.status === "occupied").length;
  const avail = seats.filter((s) => s.status === "available").length;
  const res = seats.filter((s) => s.status === "reserved").length;
  const maint = seats.filter((s) => s.status === "maintenance").length;
  const total = seats.length;
  const util = total ? Math.round((occ / total) * 100) : 0;

  // Peak hour from heatmap
  const peak = useMemo(() => {
    const data = heatData?.data ?? [];
    if (!data.length) return null;
    const byHour = new Map<number, { sum: number; n: number }>();
    for (const d of data) {
      const cur = byHour.get(d.hour) ?? { sum: 0, n: 0 };
      cur.sum += d.value; cur.n += 1; byHour.set(d.hour, cur);
    }
    let best = { hour: 0, avg: 0 };
    for (const [h, v] of byHour) {
      const avg = v.sum / v.n;
      if (avg > best.avg) best = { hour: h, avg };
    }
    return best;
  }, [heatData]);

  // Section breakdown
  const sections = useMemo(() => {
    const map = new Map<string, { total: number; occ: number; res: number; maint: number }>();
    for (const s of seats) {
      const key = s.section ?? "—";
      const cur = map.get(key) ?? { total: 0, occ: 0, res: 0, maint: 0 };
      cur.total += 1;
      if (s.status === "occupied") cur.occ += 1;
      else if (s.status === "reserved") cur.res += 1;
      else if (s.status === "maintenance") cur.maint += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  // Type mix
  const typeMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of seats) map.set(s.type, (map.get(s.type) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value], i) => ({
      name, value, color: `var(--chart-${(i % 5) + 1})`,
    }));
  }, [seats]);

  const filtered = seats.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !String(s.number).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Seat overview"
        description={activeLib ? `Real-time seat status for ${activeLib.name}.` : "Real-time seat status across your libraries."}
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 label-mono text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
            </span>
            <Button size="sm" variant="outline" onClick={() => seatsQ.refetch()} disabled={seatsQ.isFetching}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", seatsQ.isFetching && "animate-spin")} /> Refresh
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/seats/layout"><LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Floor layout</Link>
            </Button>
          </div>
        }
      />

      {libs.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {libs.slice(0, 8).map((l: any) => (
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

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Utilization" value={`${util}%`} delta={util >= 70 ? 4.1 : -2.3} hint={`${occ}/${total} seats`} icon={<Activity className="h-4 w-4" />} />
        <KpiCard label="Occupied" value={occ} hint="in-session now" icon={<Armchair className="h-4 w-4" />} />
        <KpiCard label="Available" value={avail} hint="ready for assignment" />
        <KpiCard label="Reserved" value={res} hint="next 2 hours" />
        <KpiCard label="Peak hour" value={peak ? `${String(peak.hour).padStart(2, "0")}:00` : "—"} hint={peak ? `${Math.round(peak.avg)}% avg load` : "insufficient data"} icon={<Flame className="h-4 w-4" />} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader
            title={activeLib?.name ? `${activeLib.name} · floor plan` : "Floor plan"}
            actions={<SeatLegend />}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "occupied", "available", "reserved", "maintenance"] as StatusFilter[]).map((k) => {
                const active = filter === k;
                const count = k === "all" ? total : k === "occupied" ? occ : k === "available" ? avail : k === "reserved" ? res : maint;
                return (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors capitalize",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                    )}
                  >
                    {k !== "all" && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[k as Exclude<StatusFilter, "all">].dot)} />}
                    {k}
                    <span className={cn("tabular-nums font-mono text-[10px]", active ? "opacity-80" : "text-muted-foreground")}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search seat #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 w-40 text-xs"
              />
            </div>
          </div>

          {seatsQ.isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading seats…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {seats.length === 0 ? "No seats configured yet." : "No seats match this filter."}
            </div>
          ) : (
            <SeatGrid seats={filtered} />
          )}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <SectionHeader title="Live capacity" />
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-semibold tabular-nums">{util}<span className="text-base text-muted-foreground">%</span></span>
                <Badge variant={util >= 85 ? "destructive" : util >= 60 ? "default" : "secondary"} className="text-[10px]">
                  {util >= 85 ? "Near capacity" : util >= 60 ? "Busy" : "Comfortable"}
                </Badge>
              </div>
              <Progress value={util} className="h-2" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                {(Object.keys(STATUS_META) as Exclude<StatusFilter, "all">[]).map((k) => {
                  const v = k === "occupied" ? occ : k === "available" ? avail : k === "reserved" ? res : maint;
                  return (
                    <div key={k} className="flex items-center justify-between rounded-md border bg-muted/20 px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 text-xs capitalize">
                        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[k].dot)} />
                        {STATUS_META[k].label}
                      </span>
                      <span className="font-mono text-xs tabular-nums">{v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <SectionHeader title="Seat mix" />
            {typeMix.length ? (
              <Donut data={typeMix} />
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">No data</div>
            )}
          </GlassCard>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader
            title="Utilization · 14d"
            actions={<span className="label-mono text-xs inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> avg utilization</span>}
          />
          <BarCompare
            data={att.map((d) => ({ date: d.date, util: Math.round(d.present / 3) }))}
            keys={[{ key: "util", label: "Avg utilization", color: "var(--chart-2)" }]}
            height={200}
          />
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Sections" actions={<span className="label-mono text-xs">{sections.length} total</span>} />
          {sections.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No sections</div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {sections.map(([name, s]) => {
                const pct = s.total ? Math.round((s.occ / s.total) * 100) : 0;
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Section {name}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">{s.occ}/{s.total} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                      <div className="bg-primary" style={{ width: `${(s.occ / Math.max(1, s.total)) * 100}%` }} />
                      <div className="bg-warning" style={{ width: `${(s.res / Math.max(1, s.total)) * 100}%` }} />
                      <div className="bg-destructive" style={{ width: `${(s.maint / Math.max(1, s.total)) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </section>
    </>
  );
}
