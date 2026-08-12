import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { SeatGrid, SeatLegend } from "@/components/seat-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { librariesQuery, seatGridQuery } from "@/lib/services";
import { DEMO_LIBRARIES, DEMO_SEATS_BY_LIB } from "@/lib/mock/seats-demo";
import { Search, Building2, Layers, Ruler, Printer, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/seats/layout")({
  head: () => ({ meta: [{ title: "Floor layout — SmartLibrary" }] }),
  component: LayoutPage,
});

type StatusFilter = "all" | "occupied" | "available" | "reserved" | "maintenance";

function LayoutPage() {
  const librariesQ = useQuery({ ...librariesQuery(), retry: false });
  const raw = librariesQ.data ?? [];
  const libs = raw.length ? raw : DEMO_LIBRARIES;
  const isDemo = raw.length === 0;

  const [libId, setLibId] = useState<string | undefined>();
  const activeLib = useMemo(() => libs.find((l: any) => l.id === libId) ?? libs[0], [libs, libId]);

  const seatsQ = useQuery({
    ...seatGridQuery(isDemo ? undefined : activeLib?.id),
    enabled: !isDemo,
    retry: false,
  });
  const seats: any[] = isDemo
    ? (DEMO_SEATS_BY_LIB[activeLib?.id] ?? DEMO_SEATS_BY_LIB.demo_lib_1)
    : (seatsQ.data?.seats ?? []);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<8 | 10 | 12>(10);

  const occ = seats.filter((s) => s.status === "occupied").length;
  const total = seats.length;
  const util = total ? Math.round((occ / total) * 100) : 0;

  const filtered = seats.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !String(s.number).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Seats"
        title="Interactive floor layout"
        description="Click a seat to inspect, assign, or move it."
        actions={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="secondary" className="text-[10px]">Demo data</Badge>}
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export
            </Button>
          </div>
        }
      />

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {libs.map((l: any) => (
            <button
              key={l.id}
              onClick={() => setLibId(l.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors min-w-[140px]",
                activeLib?.id === l.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
            >
              <div className="text-sm font-medium">{l.name}</div>
              <div className="text-[10px] label-mono text-muted-foreground mt-0.5">
                {(l.branch ?? "Branch")} · Floor {l.floor ?? 1}
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader
          title={activeLib?.name ?? "Library"}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{occ}/{total} seats</span>
                <Progress value={util} className="h-1.5 w-24" />
                <span className="text-xs font-mono tabular-nums">{util}%</span>
              </div>
              <SeatLegend />
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {(["all","occupied","available","reserved","maintenance"] as StatusFilter[]).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
                  filter === k ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
              <Ruler className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              {[8, 10, 12].map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d as any)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] rounded font-mono",
                    density === d ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {d}×
                </button>
              ))}
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
        </div>

        {!isDemo && seatsQ.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading seats…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {seats.length === 0 ? "No seats in this library." : "No seats match this filter."}
          </div>
        ) : (
          <SeatGrid seats={filtered} cols={density} />
        )}

        <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Floor {activeLib?.floor ?? 1}
          </span>
          <span>Tap a seat to open the actions menu.</span>
        </div>
      </GlassCard>
    </>
  );
}
