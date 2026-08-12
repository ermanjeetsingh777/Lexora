import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { PageHeader, GlassCard } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { AreaTrend } from "@/components/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { institutions, type Institution } from "@/lib/mock/data";
import {
  Building2,
  Plus,
  Search,
  Users,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  Layers,
  IndianRupee,
  Eye,
  Activity,
  Bell,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/institutions/")({
  head: () => ({ meta: [{ title: "Institutions — SmartLibrary" }] }),
  component: InstitutionsIndex,
});

const TYPE_FILTERS = ["All", "School", "College", "Library", "CoachingCenter"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

type RangeDays = 7 | 14 | 30;
type Metric = "occupancy" | "revenue";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic pseudo-random series so trends are stable per institution
function trendFor(seed: string, base: number, days: RangeDays, metric: Metric) {
  let s = 0;
  for (let i = 0; i < seed.length + metric.length; i++) {
    s = (s * 31 + (seed + metric).charCodeAt(i % (seed.length + metric.length))) >>> 0;
  }
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const scale = metric === "revenue" ? base * 120 : 1;
  return Array.from({ length: days }, (_, i) => {
    const noise = (rand() - 0.5) * (metric === "revenue" ? 30 : 18);
    const raw = base + noise + Math.sin(i / 2) * 4;
    const v =
      metric === "revenue"
        ? Math.max(0, Math.round(raw * (scale / base)))
        : Math.max(5, Math.min(98, Math.round(raw)));
    return { date: `D${i + 1}`, value: v };
  });
}

type ActivityItem = { when: string; text: string; severity: "info" | "warn" };

function activityFor(i: Institution): ActivityItem[] {
  const items: ActivityItem[] = [
    { when: "2h ago", text: `${Math.round(i.members * 0.08)} new check-ins recorded`, severity: "info" },
    { when: "5h ago", text: `Payment received · ₹${(i.revenueMTD * 0.04 / 1000).toFixed(0)}k`, severity: "info" },
    { when: "Yesterday", text: `${Math.max(1, Math.round(i.branches / 2))} branch report submitted`, severity: "info" },
    { when: "2d ago", text: `Occupancy peaked at ${Math.min(99, i.occupancy + 8)}%`, severity: "info" },
  ];
  if (i.occupancy >= 85) items.unshift({ when: "now", text: "Capacity nearing limit", severity: "warn" });
  if (i.occupancy < 35) items.unshift({ when: "now", text: "Low utilization alert", severity: "warn" });
  return items;
}

function useColumns() {
  const [cols, setCols] = useState(3);
  useLayoutEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w >= 1024 ? 3 : w >= 768 ? 2 : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

function InstitutionsIndex() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("All");
  const [quickView, setQuickView] = useState<Institution | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return institutions.filter((i) => {
      if (type !== "All" && i.type !== type) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
      );
    });
  }, [query, type]);

  const totals = useMemo(() => {
    const branches = institutions.reduce((s, i) => s + i.branches, 0);
    const members = institutions.reduce((s, i) => s + i.members, 0);
    const revenue = institutions.reduce((s, i) => s + i.revenueMTD, 0);
    const avgOccupancy =
      institutions.reduce((s, i) => s + i.occupancy, 0) / Math.max(institutions.length, 1);
    return { branches, members, revenue, avgOccupancy };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Institutions"
        description="Multi-tenant institutions, branches and libraries you manage."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> New institution
          </Button>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Institutions" value={institutions.length} icon={<Building2 className="h-4 w-4" />} delta={4.2} hint="vs last month" index={0} />
        <KpiCard label="Branches" value={totals.branches} icon={<Layers className="h-4 w-4" />} delta={2.1} index={1} />
        <KpiCard label="Members" value={totals.members.toLocaleString()} icon={<Users className="h-4 w-4" />} delta={6.8} index={2} />
        <KpiCard label="Revenue MTD" value={`₹${(totals.revenue / 100000).toFixed(1)}L`} icon={<IndianRupee className="h-4 w-4" />} delta={-1.4} hint={`${totals.avgOccupancy.toFixed(0)}% avg occupancy`} index={3} />
      </section>

      <GlassCard className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, or type…"
              className="pl-9 bg-background/60"
              aria-label="Search institutions"
            />
          </div>
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(v) => v && setType(v as TypeFilter)}
            className="flex-wrap justify-start"
          >
            {TYPE_FILTERS.map((t) => (
              <ToggleGroupItem key={t} value={t} className="text-xs h-8 px-3">
                {t === "CoachingCenter" ? "Coaching" : t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="label-mono shrink-0 md:ml-2">
            {filtered.length} institution{filtered.length === 1 ? "" : "s"}
          </div>
        </div>
      </GlassCard>

      {filtered.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="font-semibold">No institutions match</div>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter.</p>
        </GlassCard>
      ) : (
        <VirtualGrid items={filtered} onQuickView={setQuickView} />
      )}

      <QuickViewSheet
        institution={quickView}
        onOpenChange={(open) => !open && setQuickView(null)}
      />
    </>
  );
}

function VirtualGrid({
  items,
  onQuickView,
}: {
  items: Institution[];
  onQuickView: (i: Institution) => void;
}) {
  const cols = useColumns();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);

  // Measure the grid's offset from the top of the document for window virtualization.
  useLayoutEffect(() => {
    const measure = () => {
      if (!parentRef.current) return;
      const rect = parentRef.current.getBoundingClientRect();
      setOffset(rect.top + window.scrollY);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cols, items.length]);

  const rowCount = Math.ceil(items.length / cols);
  const ROW_HEIGHT = 360; // estimated card height incl. gap
  const GAP = 16;

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 4,
    scrollMargin: offset,
  });

  return (
    <div ref={parentRef} className="relative">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * cols;
          const rowItems = items.slice(start, start + cols);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <div
                className="grid gap-4 pb-4"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {rowItems.map((i, idx) => (
                  <InstitutionCard
                    key={i.id}
                    i={i}
                    idx={idx}
                    onQuickView={() => onQuickView(i)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center py-4 label-mono">
        {items.length} institution{items.length === 1 ? "" : "s"} · end of list
      </div>
    </div>
  );
}

function InstitutionCard({
  i,
  idx,
  onQuickView,
}: {
  i: Institution;
  idx: number;
  onQuickView: () => void;
}) {
  const activity = useMemo(() => activityFor(i), [i]);
  const alerts = activity.filter((a) => a.severity === "warn").length;
  const updates = activity.filter((a) => a.severity === "info").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx, 4) * 0.04, duration: 0.25 }}
      className="relative"
    >
      <button
        type="button"
        aria-label={`Quick view ${i.name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onQuickView();
        }}
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md border bg-background/80 backdrop-blur px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors shadow-sm cursor-pointer"
      >
        <Eye className="h-3.5 w-3.5" /> Quick view
      </button>

      <Link
        to="/institutions/$institutionId"
        params={{ institutionId: i.id }}
        className="group block h-full"
      >
        <GlassCard className="p-5 hover-lift h-full flex flex-col relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
          />

          <div className="flex items-start gap-3 relative pr-24">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border flex items-center justify-center font-semibold text-primary tabular-nums">
              {initials(i.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold tracking-tight truncate">{i.name}</div>
              <div className="label-mono mt-0.5 flex items-center gap-1.5">
                <span>{i.type}</span>
                <span aria-hidden>·</span>
                <MapPin className="h-3 w-3" />
                <span className="truncate">{i.city}, {i.country}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={i.status} />
            {updates > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Bell className="h-3 w-3" />
                {updates} update{updates === 1 ? "" : "s"}
              </span>
            )}
            {alerts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                <AlertTriangle className="h-3 w-3" />
                {alerts} alert{alerts === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="label-mono">Occupancy</span>
              <span className="font-mono tabular-nums">{i.occupancy}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  i.occupancy >= 80 ? "bg-success" : i.occupancy >= 50 ? "bg-primary" : "bg-warning",
                )}
                style={{ width: `${Math.min(100, Math.max(0, i.occupancy))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
            <Stat label="Branches" value={i.branches} />
            <Stat label="Members" value={i.members.toLocaleString()} />
            <Stat label="Revenue" value={`₹${(i.revenueMTD / 1000).toFixed(0)}k`} />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              Healthy
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View details <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="label-mono">{label}</div>
      <div className="font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

type LoadState = "loading" | "ready" | "error";

function QuickViewSheet({
  institution,
  onOpenChange,
}: {
  institution: Institution | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [range, setRange] = useState<RangeDays>(14);
  const [metric, setMetric] = useState<Metric>("occupancy");
  const [state, setState] = useState<LoadState>("loading");
  const [nonce, setNonce] = useState(0);

  // Simulate async load whenever institution / filters change
  useEffect(() => {
    if (!institution) return;
    setState("loading");
    const t = setTimeout(() => {
      // Deterministic, very rare failure for demo purposes; retryable.
      const fail = nonce === -1; // never auto-fail; user retries via button after manual error
      setState(fail ? "error" : "ready");
    }, 450);
    return () => clearTimeout(t);
  }, [institution, range, metric, nonce]);

  const data = useMemo(
    () => (institution ? trendFor(institution.id, institution.occupancy, range, metric) : []),
    [institution, range, metric],
  );
  const activity = useMemo(() => (institution ? activityFor(institution) : []), [institution]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  return (
    <Sheet open={!!institution} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {institution && (
          <>
            <SheetHeader>
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border flex items-center justify-center font-semibold text-primary">
                  {initials(institution.name)}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <SheetTitle className="truncate">{institution.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {institution.type} · {institution.city}, {institution.country}
                  </SheetDescription>
                </div>
                <StatusBadge status={institution.status} />
              </div>
            </SheetHeader>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Stat label="Branches" value={institution.branches} />
              <Stat label="Members" value={institution.members.toLocaleString()} />
              <Stat label="Occupancy" value={`${institution.occupancy}%`} />
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="label-mono">Trend</div>
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    type="single"
                    value={metric}
                    onValueChange={(v) => v && setMetric(v as Metric)}
                    size="sm"
                  >
                    <ToggleGroupItem value="occupancy" className="h-7 px-2 text-xs">Occupancy</ToggleGroupItem>
                    <ToggleGroupItem value="revenue" className="h-7 px-2 text-xs">Revenue</ToggleGroupItem>
                  </ToggleGroup>
                  <ToggleGroup
                    type="single"
                    value={String(range)}
                    onValueChange={(v) => v && setRange(Number(v) as RangeDays)}
                    size="sm"
                  >
                    {[7, 14, 30].map((d) => (
                      <ToggleGroupItem key={d} value={String(d)} className="h-7 px-2 text-xs">
                        {d}d
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

              <div className="rounded-lg border bg-card/60 p-2 min-h-[196px]">
                {state === "loading" && (
                  <div className="p-2 space-y-2" aria-busy="true" aria-label="Loading trend">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-[160px] w-full" />
                  </div>
                )}
                {state === "error" && (
                  <div className="flex flex-col items-center justify-center text-center py-8 px-4">
                    <AlertTriangle className="h-5 w-5 text-warning mb-2" />
                    <div className="text-sm font-medium">Couldn't load trend</div>
                    <p className="text-xs text-muted-foreground mt-1">Try again in a moment.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={retry}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                    </Button>
                  </div>
                )}
                {state === "ready" && data.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No data for this range.
                  </div>
                )}
                {state === "ready" && data.length > 0 && (
                  <AreaTrend
                    data={data}
                    height={180}
                    keys={[
                      {
                        key: "value",
                        label: metric === "revenue" ? "Revenue (₹)" : "Occupancy %",
                        color: metric === "revenue" ? "var(--chart-2, var(--color-primary))" : "var(--color-primary)",
                      },
                    ]}
                  />
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="label-mono mb-2 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Recent activity
              </div>
              {state === "loading" ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : state === "error" ? (
                <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground text-center">
                  Activity unavailable.
                </div>
              ) : activity.length === 0 ? (
                <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground text-center">
                  No recent activity yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {activity.map((a, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-lg border bg-card/60 p-3 text-sm"
                    >
                      <div
                        className={cn(
                          "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                          a.severity === "warn" ? "bg-warning" : "bg-primary",
                        )}
                      />
                      <div className="flex-1">
                        <div>{a.text}</div>
                        <div className="label-mono mt-0.5">{a.when}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <SheetFooter className="mt-6">
              <Link
                to="/institutions/$institutionId"
                params={{ institutionId: institution.id }}
                search={{ range, metric } as any}
                className="w-full"
              >
                <Button className="w-full">
                  Open full details <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
