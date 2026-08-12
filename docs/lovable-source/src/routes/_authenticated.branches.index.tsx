import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, GlassCard, SectionHeader, EmptyState } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Plus, MapPin, Search, X, Users, Activity, AlertTriangle,
  ArrowUpRight, ArrowDownRight, LayoutGrid, List, BookOpen,
  Clock, ShieldCheck, Filter, Bookmark, ChevronDown, Trash2,
  ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Link2, Check,
} from "lucide-react";
import { branches as mockBranches, institutions as mockInstitutions, libraries as mockLibraries, occupancyTrend, attendanceTrend } from "@/lib/mock/data";
import { AreaTrend, BarCompare } from "@/components/charts";

type Status = "Active" | "Maintenance" | "Closed";
type View = "grid" | "table";
type Band = "low" | "mid" | "high";
type SortKey = "name" | "city" | "institution" | "capacity" | "occupancy" | "libraries" | "members" | "status";
type SortDir = "asc" | "desc";

const SORT_KEYS = ["name", "city", "institution", "capacity", "occupancy", "libraries", "members", "status"] as const;
const PAGE_SIZE = 12;

type BranchSearch = {
  view?: View;
  q?: string;
  statuses?: string;     // csv
  insts?: string;        // csv
  cities?: string;       // csv
  bands?: string;        // csv of low|mid|high
  preset?: string;
  sort?: SortKey;
  dir?: SortDir;
  page?: number;
};

export const Route = createFileRoute("/_authenticated/branches/")({
  head: () => ({ meta: [{ title: "Branches — SmartLibrary" }] }),
  validateSearch: (s: Record<string, unknown>): BranchSearch => {
    const out: BranchSearch = {};
    if (s.view === "grid" || s.view === "table") out.view = s.view;
    if (typeof s.q === "string" && s.q) out.q = s.q;
    for (const k of ["statuses", "insts", "cities", "bands", "preset"] as const) {
      if (typeof s[k] === "string" && (s[k] as string).length) out[k] = s[k] as string;
    }
    if (typeof s.sort === "string" && (SORT_KEYS as readonly string[]).includes(s.sort)) out.sort = s.sort as SortKey;
    if (s.dir === "asc" || s.dir === "desc") out.dir = s.dir;
    const pageNum = typeof s.page === "number" ? s.page : typeof s.page === "string" ? parseInt(s.page, 10) : NaN;
    if (Number.isFinite(pageNum) && pageNum > 1) out.page = pageNum;
    return out;
  },
  component: BranchesPage,
});

const MANAGERS = ["Priya Nair", "Rohan Kapoor", "Saanvi Iyer", "Aarav Sharma", "Ishita Bose", "Kabir Khan", "Diya Verma", "Vivaan Joshi", "Anika Reddy", "Veer Singh"];
const STATUS_ROTATION: Status[] = ["Active", "Active", "Active", "Active", "Maintenance", "Active", "Closed"];

interface EnrichedBranch {
  id: string; name: string; city: string;
  institutionId: string; institutionName: string;
  capacity: number; occupancy: number; occupancyPct: number;
  libraries: number; members: number; status: Status;
  manager: string; hoursStart: string; hoursEnd: string; trend: number;
  band: Band;
}

function enrich(): EnrichedBranch[] {
  return mockBranches.map((b, i) => {
    const inst = mockInstitutions.find((x) => x.id === b.institutionId)!;
    const occPct = Math.min(100, Math.round((b.occupancy / Math.max(1, b.capacity)) * 100 + 25));
    const band: Band = occPct < 50 ? "low" : occPct < 80 ? "mid" : "high";
    return {
      id: b.id, name: b.name, city: b.city,
      institutionId: b.institutionId, institutionName: inst?.name ?? "—",
      capacity: b.capacity,
      occupancy: Math.round((b.capacity * occPct) / 100),
      occupancyPct: occPct,
      libraries: b.libraries, members: b.members,
      status: STATUS_ROTATION[i % STATUS_ROTATION.length],
      manager: MANAGERS[i % MANAGERS.length],
      hoursStart: "08:00",
      hoursEnd: i % 4 === 0 ? "22:00" : "20:00",
      trend: ((i * 7) % 21) - 8,
      band,
    };
  });
}

// ---------- Presets ----------
type Preset = {
  id: string; name: string;
  q?: string;
  statuses: Status[];
  insts: string[];
  cities: string[];
  bands: Band[];
};

const PRESET_KEY = "branches:filter-presets";
const DEFAULT_PRESETS: Preset[] = [
  { id: "near-capacity", name: "Near capacity", statuses: [], insts: [], cities: [], bands: ["high"] },
  { id: "maintenance", name: "Maintenance today", statuses: ["Maintenance"], insts: [], cities: [], bands: [] },
];

function loadPresets(): Preset[] {
  if (typeof window === "undefined") return DEFAULT_PRESETS;
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return DEFAULT_PRESETS;
    const arr = JSON.parse(raw) as Preset[];
    return Array.isArray(arr) && arr.length ? arr : DEFAULT_PRESETS;
  } catch { return DEFAULT_PRESETS; }
}
function savePresets(p: Preset[]) {
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

const csv = (a: string[]) => (a.length ? a.join(",") : undefined);
const parseCsv = <T extends string,>(v: string | undefined, allowed?: readonly T[]): T[] => {
  if (!v) return [];
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  return allowed ? (parts.filter((p) => (allowed as readonly string[]).includes(p)) as T[]) : (parts as T[]);
};

// ---------- Page ----------
function BranchesPage() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;
  const all = useMemo(enrich, []);

  const view: View = search.view ?? "grid";
  const q = search.q ?? "";
  const statuses = parseCsv<Status>(search.statuses, ["Active", "Maintenance", "Closed"] as const);
  const insts = parseCsv<string>(search.insts);
  const cities = parseCsv<string>(search.cities);
  const bands = parseCsv<Band>(search.bands, ["low", "mid", "high"] as const);
  const sortKey: SortKey = (search.sort as SortKey) ?? "occupancy";
  const sortDir: SortDir = search.dir ?? "desc";
  const page = Math.max(1, search.page ?? 1);

  // Skeleton + debounce
  const [loading, setLoading] = useState(true);
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => { setQLocal(q); }, [q]);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 280);
    return () => clearTimeout(t);
  }, [q, search.statuses, search.insts, search.cities, search.bands, view]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qLocal !== q) update({ q: qLocal || undefined });
    }, 220);
    return () => clearTimeout(t);
  }, [qLocal]); // eslint-disable-line

  const FILTER_KEYS = ["q", "statuses", "insts", "cities", "bands", "preset"] as const;
  const update = (patch: Partial<BranchSearch>) =>
    navigate({
      to: "/branches",
      search: (prev: BranchSearch) => {
        const next = { ...prev, ...patch };
        // Any filter change resets pagination
        if (FILTER_KEYS.some((k) => k in patch)) next.page = undefined;
        return next;
      },
      replace: true,
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) update({ dir: sortDir === "asc" ? "desc" : "asc" });
    else update({ sort: key, dir: key === "name" || key === "city" || key === "institution" || key === "status" ? "asc" : "desc" });
  };

  const [copied, setCopied] = useState(false);
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* noop */ }
  };

  // Presets
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  useEffect(() => { savePresets(presets); }, [presets]);

  const applyPreset = (p: Preset) => update({
    q: p.q || undefined,
    statuses: csv(p.statuses), insts: csv(p.insts),
    cities: csv(p.cities), bands: csv(p.bands),
    preset: p.id,
  });
  const saveCurrent = () => {
    const name = window.prompt("Name this view");
    if (!name) return;
    const id = `p-${Date.now()}`;
    const next: Preset = { id, name, q: q || undefined, statuses, insts, cities, bands };
    setPresets((arr) => [...arr, next]);
    update({ preset: id });
  };
  const deletePreset = (id: string) => setPresets((arr) => arr.filter((p) => p.id !== id));

  // Filter
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((b) => {
      if (needle && ![b.name, b.city, b.institutionName, b.manager].some((v) => v.toLowerCase().includes(needle))) return false;
      if (statuses.length && !statuses.includes(b.status)) return false;
      if (insts.length && !insts.includes(b.institutionId)) return false;
      if (cities.length && !cities.includes(b.city)) return false;
      if (bands.length && !bands.includes(b.band)) return false;
      return true;
    });
  }, [all, q, statuses, insts, cities, bands]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: EnrichedBranch, b: EnrichedBranch): number => {
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "city": return a.city.localeCompare(b.city) * dir;
        case "institution": return a.institutionName.localeCompare(b.institutionName) * dir;
        case "status": return a.status.localeCompare(b.status) * dir;
        case "capacity": return (a.capacity - b.capacity) * dir;
        case "libraries": return (a.libraries - b.libraries) * dir;
        case "members": return (a.members - b.members) * dir;
        case "occupancy":
        default: return (a.occupancyPct - b.occupancyPct) * dir;
      }
    };
    return arr.sort(cmp);
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sorted, safePage]
  );
  const goPage = (n: number) => navigate({
    to: "/branches",
    search: (prev: BranchSearch) => ({ ...prev, page: n <= 1 ? undefined : n }),
    replace: true,
  });

  // KPIs (filtered when filters active for live drill-down)
  const base = filtered.length ? filtered : all;
  const totalCap = base.reduce((s, b) => s + b.capacity, 0);
  const totalOcc = base.reduce((s, b) => s + b.occupancy, 0);
  const avgOcc = base.length ? Math.round(base.reduce((s, b) => s + b.occupancyPct, 0) / base.length) : 0;
  const nearCap = base.filter((b) => b.occupancyPct >= 80).length;
  const activeCount = base.filter((b) => b.status === "Active").length;
  const top = [...base].sort((a, b) => b.occupancyPct - a.occupancyPct)[0];
  const attention = [...base].sort((a, b) => a.occupancyPct - b.occupancyPct).slice(0, 4);
  const totalLibs = mockLibraries.length;
  const cityCount = new Set(all.map((b) => b.city)).size;
  const allCities = useMemo(() => Array.from(new Set(all.map((b) => b.city))).sort(), [all]);

  const hasFilters = !!q || statuses.length > 0 || insts.length > 0 || cities.length > 0 || bands.length > 0;
  const clearAll = () => { setQLocal(""); update({ q: undefined, statuses: undefined, insts: undefined, cities: undefined, bands: undefined, preset: undefined }); };

  // Drill-down: scroll/highlight charts
  const chartsRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const focusCharts = () => {
    chartsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlash(true);
    setTimeout(() => setFlash(false), 1400);
  };

  // Charts data
  const occSeries = useMemo(() => occupancyTrend(30), []);
  const topBars = useMemo(
    () => [...filtered].sort((a, b) => b.occupancyPct - a.occupancyPct).slice(0, 8).map((b) => ({
      date: b.name.length > 14 ? b.name.slice(0, 12) + "…" : b.name,
      occupancy: b.occupancyPct,
    })),
    [filtered]
  );
  const footfall = useMemo(() => {
    const att = attendanceTrend(14);
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
      const slice = att.slice(i, i + 2);
      const present = slice.reduce((s, x) => s + x.present, 0);
      return {
        date: d,
        morning: Math.round(present * 0.32),
        afternoon: Math.round(present * 0.38),
        evening: Math.round(present * 0.30),
      };
    });
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Branches"
        description="Physical branch locations across every institution."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/institutions">View institutions</Link>
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New branch
            </Button>
          </>
        }
      />

      {/* KPI strip — drill-downs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={clearAll} className="text-left">
          <KpiCard label="Total branches" value={base.length} icon={<Building2 className="h-4 w-4" />} hint={`${activeCount} active`} index={0} />
        </button>
        <button onClick={focusCharts} className="text-left">
          <KpiCard label="Total capacity" value={totalCap.toLocaleString()} icon={<Users className="h-4 w-4" />} hint={`${totalOcc.toLocaleString()} occupied now`} index={1} />
        </button>
        <button onClick={focusCharts} className="text-left">
          <KpiCard label="Avg occupancy" value={`${avgOcc}%`} icon={<Activity className="h-4 w-4" />} hint="across visible branches" index={2} />
        </button>
        <button onClick={() => update({ bands: "high", preset: "near-capacity" })} className="text-left">
          <KpiCard label="Near capacity" value={nearCap} icon={<AlertTriangle className="h-4 w-4" />} hint="≥ 80% full" index={3} />
        </button>
      </section>

      {/* Filter bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Search branch, city, manager…"
              className="pl-8 h-9"
            />
          </div>

          <MultiSelect
            label="Status" icon={<ShieldCheck className="h-3.5 w-3.5" />}
            options={(["Active", "Maintenance", "Closed"] as Status[]).map((s) => ({ value: s, label: s }))}
            selected={statuses}
            onChange={(v) => update({ statuses: csv(v as Status[]) })}
          />
          <MultiSelect
            label="Institution" icon={<Building2 className="h-3.5 w-3.5" />}
            options={mockInstitutions.map((i) => ({ value: i.id, label: i.name }))}
            selected={insts}
            onChange={(v) => update({ insts: csv(v) })}
          />
          <MultiSelect
            label="City" icon={<MapPin className="h-3.5 w-3.5" />}
            options={allCities.map((c) => ({ value: c, label: c }))}
            selected={cities}
            onChange={(v) => update({ cities: csv(v) })}
          />
          <MultiSelect
            label="Occupancy" icon={<Activity className="h-3.5 w-3.5" />}
            options={[
              { value: "low", label: "< 50%" },
              { value: "mid", label: "50–80%" },
              { value: "high", label: "≥ 80%" },
            ]}
            selected={bands}
            onChange={(v) => update({ bands: csv(v as Band[]) })}
          />

          {/* Presets */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Bookmark className="h-3.5 w-3.5" />
                {presets.find((p) => p.id === search.preset)?.name ?? "Presets"}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs">Saved views</DropdownMenuLabel>
              {presets.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={(e) => { e.preventDefault(); applyPreset(p); }} className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePreset(p.id); }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete preset"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); saveCurrent(); }}>
                <Plus className="h-3 w-3 mr-1" /> Save current view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} / {all.length}</span>
            {hasFilters && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={clearAll}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={copyShareLink} title="Copy shareable link">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
            </Button>
            <Tabs value={view} onValueChange={(v) => update({ view: v as View })}>
              <TabsList className="h-9">
                <TabsTrigger value="grid" className="px-2"><LayoutGrid className="h-3.5 w-3.5" /></TabsTrigger>
                <TabsTrigger value="table" className="px-2"><List className="h-3.5 w-3.5" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Active chips */}
        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {statuses.map((s) => <FilterChip key={s} label={s} onRemove={() => update({ statuses: csv(statuses.filter((x) => x !== s)) })} />)}
            {insts.map((id) => {
              const i = mockInstitutions.find((x) => x.id === id);
              return <FilterChip key={id} label={i?.name ?? id} onRemove={() => update({ insts: csv(insts.filter((x) => x !== id)) })} />;
            })}
            {cities.map((c) => <FilterChip key={c} label={c} onRemove={() => update({ cities: csv(cities.filter((x) => x !== c)) })} />)}
            {bands.map((b) => <FilterChip key={b} label={b === "low" ? "< 50%" : b === "mid" ? "50–80%" : "≥ 80%"} onRemove={() => update({ bands: csv(bands.filter((x) => x !== b)) })} />)}
          </div>
        )}
      </GlassCard>

      {/* Charts */}
      <div
        ref={chartsRef}
        className={`grid grid-cols-1 lg:grid-cols-3 gap-4 transition-shadow rounded-xl ${flash ? "ring-2 ring-primary/60" : ""}`}
      >
        <GlassCard className="p-5 lg:col-span-2">
          <SectionHeader title="Network occupancy" description="Rolling 30 days, all branches" />
          {loading ? <Skeleton className="h-[240px] w-full" /> : (
            <AreaTrend
              data={occSeries}
              keys={[{ key: "occupancy", label: "Occupancy %", color: "oklch(0.62 0.18 258)" }]}
            />
          )}
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Top occupancy" description="Highest 8 right now" />
          {loading ? <Skeleton className="h-[240px] w-full" /> : topBars.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches in view.</p>
          ) : (
            <BarCompare
              data={topBars}
              keys={[{ key: "occupancy", label: "Occupancy %", color: "oklch(0.7 0.16 165)" }]}
            />
          )}
        </GlassCard>
        <GlassCard className="p-5 lg:col-span-3">
          <SectionHeader title="Weekly footfall by shift" description="Mon–Sun, stacked by shift" />
          {loading ? <Skeleton className="h-[240px] w-full" /> : (
            <BarCompare
              data={footfall}
              keys={[
                { key: "morning", label: "Morning", color: "oklch(0.78 0.13 80)" },
                { key: "afternoon", label: "Afternoon", color: "oklch(0.65 0.17 258)" },
                { key: "evening", label: "Evening", color: "oklch(0.62 0.18 320)" },
              ]}
            />
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            view === "grid" ? <GridSkeleton /> : <TableSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title={hasFilters ? "No branches match your filters" : "No branches yet"}
              description={hasFilters
                ? "Try clearing search, status, city or occupancy filters."
                : "Create your first branch to see it here."}
              action={hasFilters
                ? <Button size="sm" variant="outline" onClick={clearAll}>Clear filters</Button>
                : <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New branch</Button>}
            />
          ) : view === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageItems.map((b) => <BranchCard key={b.id} b={b} />)}
              </div>
              <Pagination page={safePage} totalPages={totalPages} total={sorted.length} pageSize={PAGE_SIZE} onChange={goPage} />
            </>
          ) : (
            <>
              <GlassCard className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b label-mono bg-muted/30">
                      <SortableTh label="Branch" k="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="py-2 px-3" />
                      <SortableTh label="Institution" k="institution" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="px-3" />
                      <SortableTh label="Capacity" k="capacity" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="px-3" align="right" />
                      <SortableTh label="Occupancy" k="occupancy" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="px-3 min-w-[160px]" />
                      <SortableTh label="Libs" k="libraries" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="px-3" align="right" />
                      <SortableTh label="Members" k="members" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="px-3" align="right" />
                      <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pageItems.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/40 cursor-pointer"
                        onClick={() => navigate({ to: "/branches/$branchId", params: { branchId: b.id } })}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium">{b.name}</div>
                          <div className="label-mono flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{b.city}</div>
                        </td>
                        <td className="px-3 text-muted-foreground">{b.institutionName}</td>
                        <td className="px-3 text-right tabular-nums">{b.capacity.toLocaleString()}</td>
                        <td className="px-3" onClick={(e) => e.stopPropagation()}>
                          <Link to="/branches/$branchId" params={{ branchId: b.id }} search={{ tab: "usage" }} className="flex items-center gap-2 hover:text-primary">
                            <Progress value={b.occupancyPct} className="h-1.5" />
                            <span className="tabular-nums text-xs w-9 text-right">{b.occupancyPct}%</span>
                          </Link>
                        </td>
                        <td className="px-3 text-right tabular-nums" onClick={(e) => e.stopPropagation()}>
                          <Link to="/branches/$branchId" params={{ branchId: b.id }} search={{ tab: "libraries" }} className="hover:text-primary">{b.libraries}</Link>
                        </td>
                        <td className="px-3 text-right tabular-nums">{b.members}</td>
                        <td className="px-3"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
              <Pagination page={safePage} totalPages={totalPages} total={sorted.length} pageSize={PAGE_SIZE} onChange={goPage} />
            </>
          )}
        </div>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <SectionHeader title="Top performer" description="Highest live occupancy" />
            {loading ? <Skeleton className="h-32 w-full" /> : top ? (
              <Link to="/branches/$branchId" params={{ branchId: top.id }} className="block hover-lift rounded-md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{top.name}</p>
                      <p className="label-mono flex items-center gap-1"><MapPin className="h-3 w-3" />{top.city}</p>
                    </div>
                    <Badge className="gap-1"><ArrowUpRight className="h-3 w-3" />{top.occupancyPct}%</Badge>
                  </div>
                  <Progress value={top.occupancyPct} />
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div><p className="text-sm font-semibold tabular-nums">{top.members}</p><p className="label-mono">Members</p></div>
                    <div><p className="text-sm font-semibold tabular-nums">{top.libraries}</p><p className="label-mono">Libraries</p></div>
                    <div><p className="text-sm font-semibold tabular-nums">{top.capacity}</p><p className="label-mono">Seats</p></div>
                  </div>
                </div>
              </Link>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </GlassCard>

          <GlassCard className="p-5">
            <SectionHeader title="Needs attention" description="Lowest occupancy" />
            {loading ? <Skeleton className="h-32 w-full" /> : (
              <ul className="space-y-2.5">
                {attention.map((b) => (
                  <li key={b.id}>
                    <Link to="/branches/$branchId" params={{ branchId: b.id }} className="flex items-center justify-between text-sm hover:text-primary">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{b.name}</p>
                        <p className="label-mono">{b.institutionName}</p>
                      </div>
                      <Badge variant="secondary" className="tabular-nums gap-1">
                        <ArrowDownRight className="h-3 w-3" />{b.occupancyPct}%
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <SectionHeader title="Network at a glance" />
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-md border bg-card/40 p-3">
                <BookOpen className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-semibold tabular-nums mt-1">{totalLibs}</p>
                <p className="label-mono">Libraries</p>
              </div>
              <div className="rounded-md border bg-card/40 p-3">
                <MapPin className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-semibold tabular-nums mt-1">{cityCount}</p>
                <p className="label-mono">Cities</p>
              </div>
              <div className="rounded-md border bg-card/40 p-3">
                <ShieldCheck className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-semibold tabular-nums mt-1">{activeCount}</p>
                <p className="label-mono">Active</p>
              </div>
              <div className="rounded-md border bg-card/40 p-3">
                <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-semibold tabular-nums mt-1">24/7</p>
                <p className="label-mono">Monitoring</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {label}
      <button onClick={onRemove} className="hover:text-destructive" aria-label="Remove filter">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function MultiSelect({
  label, icon, options, selected, onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          {icon}
          <span>{label}</span>
          {selected.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{selected.length}</Badge>}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2 max-h-72 overflow-auto">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="label-mono">{label}</p>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>
        <div className="space-y-0.5">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const variant = status === "Active" ? "default" : status === "Maintenance" ? "secondary" : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

function BranchCard({ b }: { b: EnrichedBranch }) {
  const trendUp = b.trend >= 0;
  return (
    <Link to="/branches/$branchId" params={{ branchId: b.id }} className="block">
      <GlassCard className="p-5 hover-lift h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold tracking-tight truncate">{b.name}</p>
            <p className="label-mono mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{b.city} · {b.institutionName}</p>
          </div>
          <StatusBadge status={b.status} />
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Live occupancy</span>
            <span className="flex items-center gap-1 tabular-nums">
              {trendUp ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-amber-500" />}
              {trendUp ? "+" : ""}{b.trend}% wow
            </span>
          </div>
          <Progress value={b.occupancyPct} className="h-1.5" />
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="font-medium">{b.occupancy} / {b.capacity}</span>
            <span className="text-muted-foreground">{b.occupancyPct}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center">
          <div><p className="label-mono">Libraries</p><p className="font-semibold tabular-nums mt-1">{b.libraries}</p></div>
          <div><p className="label-mono">Members</p><p className="font-semibold tabular-nums mt-1">{b.members}</p></div>
          <div><p className="label-mono">Hours</p><p className="font-semibold tabular-nums mt-1">{b.hoursStart}–{b.hoursEnd}</p></div>
        </div>

        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground truncate">Manager · <span className="text-foreground font-medium">{b.manager}</span></span>
          <span className="label-mono">View →</span>
        </div>
      </GlassCard>
    </Link>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <GlassCard key={i} className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-3 gap-2 pt-3 border-t">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-3 w-12 mx-auto" />
                <Skeleton className="h-4 w-10 mx-auto" />
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <GlassCard className="p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
          <Skeleton className="h-9 w-9 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2 w-1/4" />
          </div>
          <Skeleton className="h-2 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </GlassCard>
  );
}

function SortableTh({
  label, k, sortKey, sortDir, onToggle, className, align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (k: SortKey) => void;
  className?: string;
  align?: "right";
}) {
  const active = sortKey === k;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onToggle(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""} ${align === "right" ? "w-full justify-end" : ""}`}
      >
        <span>{label}</span>
        {active ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronDown className="h-3 w-3 opacity-30" />}
      </button>
    </th>
  );
}

function Pagination({
  page, totalPages, total, pageSize, onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (n: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <span className="text-xs text-muted-foreground tabular-nums">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-8 px-2" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs tabular-nums px-2">Page {page} / {totalPages}</span>
        <Button size="sm" variant="outline" className="h-8 px-2" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
