import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { PageHeader, GlassCard, EmptyState } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  BookOpen, Plus, Search, X, LayoutGrid, List, Building2, ShieldCheck,
  Users, Activity, MapPin, Clock, ChevronDown, Layers, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Link2, Check, QrCode, Eye,
} from "lucide-react";
import { libraries as mockLibraries, branches as mockBranches, institutions as mockInstitutions, generateSeats } from "@/lib/mock/data";
import { SeatGrid, SeatLegend } from "@/components/seat-grid";

type View = "grid" | "table";
type Band = "low" | "mid" | "high";
type SortKey = "name" | "branch" | "floor" | "capacity" | "occupancy" | "status";
type SortDir = "asc" | "desc";

const SORT_KEYS = ["name", "branch", "floor", "capacity", "occupancy", "status"] as const;
const PAGE_SIZE = 12;

type LibSearch = {
  view?: View;
  q?: string;
  statuses?: string;
  branches?: string;
  bands?: string;
  floors?: string;
  sort?: SortKey;
  dir?: SortDir;
  page?: number;
  preview?: string;
};

export const Route = createFileRoute("/_authenticated/libraries/")({
  head: () => ({ meta: [{ title: "Libraries — SmartLibrary" }] }),
  validateSearch: (s: Record<string, unknown>): LibSearch => {
    const out: LibSearch = {};
    if (s.view === "grid" || s.view === "table") out.view = s.view;
    if (typeof s.q === "string" && s.q) out.q = s.q;
    for (const k of ["statuses", "branches", "bands", "floors", "preview"] as const) {
      if (typeof s[k] === "string" && (s[k] as string).length) out[k] = s[k] as string;
    }
    if (typeof s.sort === "string" && (SORT_KEYS as readonly string[]).includes(s.sort)) out.sort = s.sort as SortKey;
    if (s.dir === "asc" || s.dir === "desc") out.dir = s.dir;
    const pageNum = typeof s.page === "number" ? s.page : typeof s.page === "string" ? parseInt(s.page, 10) : NaN;
    if (Number.isFinite(pageNum) && pageNum > 1) out.page = pageNum;
    return out;
  },
  component: Page,
});

const csv = (a: string[]) => (a.length ? a.join(",") : undefined);
const parseCsv = <T extends string,>(v: string | undefined, allowed?: readonly T[]): T[] => {
  if (!v) return [];
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  return allowed ? (parts.filter((p) => (allowed as readonly string[]).includes(p)) as T[]) : (parts as T[]);
};

function Page() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;

  const branchMap = useMemo(() => new Map(mockBranches.map((b) => [b.id, b])), []);
  const institutionMap = useMemo(() => new Map(mockInstitutions.map((i) => [i.id, i])), []);

  const view: View = search.view ?? "grid";
  const q = search.q ?? "";
  const statuses = parseCsv<string>(search.statuses);
  const branchIds = parseCsv<string>(search.branches);
  const bands = parseCsv<Band>(search.bands, ["low", "mid", "high"] as const);
  const floors = parseCsv<string>(search.floors);
  const sortKey: SortKey = (search.sort as SortKey) ?? "occupancy";
  const sortDir: SortDir = search.dir ?? "desc";
  const page = Math.max(1, search.page ?? 1);

  const [qLocal, setQLocal] = useState(q);
  useEffect(() => { setQLocal(q); }, [q]);

  const FILTER_KEYS = ["q", "statuses", "branches", "bands", "floors"] as const;
  const update = (patch: Partial<LibSearch>) =>
    navigate({
      to: "/libraries",
      search: (prev: LibSearch) => {
        const next = { ...prev, ...patch };
        if (FILTER_KEYS.some((k) => k in patch)) next.page = undefined;
        return next;
      },
      replace: true,
    });

  useEffect(() => {
    const t = setTimeout(() => { if (qLocal !== q) update({ q: qLocal || undefined }); }, 220);
    return () => clearTimeout(t);
  }, [qLocal]); // eslint-disable-line

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) update({ dir: sortDir === "asc" ? "desc" : "asc" });
    else update({ sort: key, dir: key === "name" || key === "branch" || key === "status" ? "asc" : "desc" });
  };

  const [copied, setCopied] = useState(false);
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* noop */ }
  };

  const enriched = useMemo(() => {
    return mockLibraries.map((l) => {
      const b = branchMap.get(l.branchId);
      const inst = b ? institutionMap.get(b.institutionId) : undefined;
      const pct = l.capacity ? Math.min(100, Math.round((l.occupied / l.capacity) * 100)) : 0;
      const band: Band = pct < 50 ? "low" : pct < 80 ? "mid" : "high";
      return {
        id: l.id, name: l.name, floor: l.floor,
        capacity: l.capacity, seats: l.capacity, occupied: l.occupied, pct, band,
        status: l.status, hours: `${l.operatingStart}–${l.operatingEnd}`,
        branchId: l.branchId, branchName: b?.name ?? "—",
        institutionName: inst?.name ?? "", city: b?.city ?? "",
      };
    });
  }, [branchMap, institutionMap]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enriched.filter((l) => {
      if (needle && ![l.name, l.branchName, l.institutionName, l.city].some((v) => v.toLowerCase().includes(needle))) return false;
      if (statuses.length && !statuses.includes(l.status)) return false;
      if (branchIds.length && !branchIds.includes(l.branchId)) return false;
      if (bands.length && !bands.includes(l.band)) return false;
      if (floors.length && !floors.includes(String(l.floor))) return false;
      return true;
    });
  }, [enriched, q, statuses, branchIds, bands, floors]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "branch": return a.branchName.localeCompare(b.branchName) * dir;
        case "status": return a.status.localeCompare(b.status) * dir;
        case "floor": return (a.floor - b.floor) * dir;
        case "capacity": return (a.capacity - b.capacity) * dir;
        case "occupancy":
        default: return (a.pct - b.pct) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sorted, safePage]
  );
  const goPage = (n: number) => navigate({
    to: "/libraries",
    search: (prev: LibSearch) => ({ ...prev, page: n <= 1 ? undefined : n }),
    replace: true,
  });

  const totalCap = filtered.reduce((s, l) => s + l.capacity, 0);
  const totalOcc = filtered.reduce((s, l) => s + l.occupied, 0);
  const avgOcc = filtered.length ? Math.round(filtered.reduce((s, l) => s + l.pct, 0) / filtered.length) : 0;
  const activeCount = filtered.filter((l) => l.status === "Active").length;

  const hasFilters = !!q || statuses.length > 0 || branchIds.length > 0 || bands.length > 0 || floors.length > 0;
  const clearAll = () => { setQLocal(""); update({ q: undefined, statuses: undefined, branches: undefined, bands: undefined, floors: undefined }); };

  const statusOptions = useMemo(
    () => Array.from(new Set(enriched.map((l) => l.status))).map((s) => ({ value: s, label: s })),
    [enriched],
  );
  const branchOptions = useMemo(
    () => mockBranches.map((b) => ({ value: b.id, label: b.name })),
    [],
  );
  const floorOptions = useMemo(
    () => Array.from(new Set(enriched.map((l) => l.floor))).sort((a, b) => a - b).map((f) => ({ value: String(f), label: `Floor ${f}` })),
    [enriched],
  );

  const previewLib = useMemo(
    () => (search.preview ? enriched.find((l) => l.id === search.preview) ?? null : null),
    [search.preview, enriched],
  );
  const openPreview = (id: string) => update({ preview: id });
  const closePreview = () => update({ preview: undefined });

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Libraries"
        description="Library spaces with seats, sections and operating hours."
        actions={
          <Button size="sm" asChild>
            <Link to="/libraries/create"><Plus className="h-4 w-4 mr-1" /> New library</Link>
          </Button>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total libraries" value={filtered.length} icon={<BookOpen className="h-4 w-4" />} hint={`${activeCount} active`} index={0} />
        <KpiCard label="Total capacity" value={totalCap.toLocaleString()} icon={<Users className="h-4 w-4" />} hint={`${totalOcc.toLocaleString()} occupied now`} index={1} />
        <KpiCard label="Avg occupancy" value={`${avgOcc}%`} icon={<Activity className="h-4 w-4" />} hint="across visible libraries" index={2} />
        <KpiCard label="Branches covered" value={new Set(filtered.map((l) => l.branchId)).size} icon={<Building2 className="h-4 w-4" />} hint="with at least one library" index={3} />
      </section>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={qLocal} onChange={(e) => setQLocal(e.target.value)} placeholder="Search library, branch, city…" className="pl-8 h-9" />
          </div>

          <MultiSelect
            label="Status" icon={<ShieldCheck className="h-3.5 w-3.5" />}
            options={statusOptions} selected={statuses}
            onChange={(v) => update({ statuses: csv(v) })}
          />
          <MultiSelect
            label="Branch" icon={<Building2 className="h-3.5 w-3.5" />}
            options={branchOptions} selected={branchIds}
            onChange={(v) => update({ branches: csv(v) })}
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
          <MultiSelect
            label="Floor" icon={<Layers className="h-3.5 w-3.5" />}
            options={floorOptions} selected={floors}
            onChange={(v) => update({ floors: csv(v) })}
          />

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} / {enriched.length}</span>
            {hasFilters && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={clearAll}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={copyShareLink}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              <span className="text-xs">{copied ? "Copied" : "Share"}</span>
            </Button>
            <Tabs value={view} onValueChange={(v) => update({ view: v as View })}>
              <TabsList className="h-9">
                <TabsTrigger value="grid" className="px-2"><LayoutGrid className="h-3.5 w-3.5" /></TabsTrigger>
                <TabsTrigger value="table" className="px-2"><List className="h-3.5 w-3.5" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </GlassCard>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title={hasFilters ? "No libraries match your filters" : "No libraries yet"}
          description={hasFilters
            ? "Try clearing your search or filters."
            : "Create a library inside one of your branches."}
          action={hasFilters
            ? <Button size="sm" variant="outline" onClick={clearAll}>Clear filters</Button>
            : <Button asChild size="sm"><Link to="/libraries/create">Create library</Link></Button>}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map((l) => (
            <GlassCard key={l.id} className="p-5 hover-lift h-full flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <Link to="/libraries/$libraryId" params={{ libraryId: l.id }} className="min-w-0 flex-1">
                  <div className="font-semibold tracking-tight truncate">{l.name}</div>
                  <div className="label-mono mt-0.5 flex items-center gap-1 truncate">
                    <Building2 className="h-3 w-3" />{l.branchName} · Floor {l.floor}
                  </div>
                </Link>
                <Badge variant={l.status === "Active" ? "default" : "secondary"}>{l.status}</Badge>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Occupancy</span>
                  <span className="tabular-nums">{l.occupied}/{l.seats}</span>
                </div>
                <Progress value={l.pct} className="h-1.5" />
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="font-medium">{l.pct}%</span>
                  {l.city && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{l.city}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center">
                <div><p className="label-mono">Capacity</p><p className="font-semibold tabular-nums mt-1">{l.capacity}</p></div>
                <div><p className="label-mono">Seats</p><p className="font-semibold tabular-nums mt-1">{l.seats}</p></div>
                <div>
                  <p className="label-mono flex items-center justify-center gap-1"><Clock className="h-3 w-3" />Hours</p>
                  <p className="font-semibold tabular-nums mt-1 text-xs">{l.hours}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 flex-1 gap-1" onClick={() => openPreview(l.id)}>
                  <Eye className="h-3.5 w-3.5" /> Seat preview
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1" asChild>
                  <Link to="/libraries/$libraryId" params={{ libraryId: l.id }}>Details</Link>
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b label-mono bg-muted/30">
                <SortableTh label="Library" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Branch" k="branch" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Floor" k="floor" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Capacity" k="capacity" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortableTh label="Occupancy" k="occupancy" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3">Hours</th>
                <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageItems.map((l) => (
                <tr key={l.id} className="hover:bg-muted/40">
                  <td className="py-2.5 px-3">
                    <Link to="/libraries/$libraryId" params={{ libraryId: l.id }} className="font-medium flex items-center gap-2 hover:underline">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />{l.name}
                    </Link>
                  </td>
                  <td className="px-3 text-muted-foreground">{l.branchName}</td>
                  <td className="px-3 text-right tabular-nums">{l.floor}</td>
                  <td className="px-3 text-right tabular-nums">{l.capacity}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <Progress value={l.pct} className="h-1.5" />
                      <span className="tabular-nums text-xs w-9 text-right">{l.pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 tabular-nums text-xs">{l.hours}</td>
                  <td className="px-3"><Badge variant={l.status === "Active" ? "default" : "secondary"}>{l.status}</Badge></td>
                  <td className="px-3 text-right">
                    <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => openPreview(l.id)}>
                      <QrCode className="h-3.5 w-3.5" /> Preview
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Page {safePage} of {totalPages} · {sorted.length} libraries
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={safePage <= 1} onClick={() => goPage(safePage - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={safePage >= totalPages} onClick={() => goPage(safePage + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={!!previewLib} onOpenChange={(o) => !o && closePreview()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {previewLib && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> {previewLib.name}
                </SheetTitle>
                <SheetDescription>
                  {previewLib.branchName} · Floor {previewLib.floor} · {previewLib.hours}
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-lg border p-3">
                  <p className="label-mono">Capacity</p>
                  <p className="font-semibold tabular-nums mt-1">{previewLib.capacity}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="label-mono">Occupied</p>
                  <p className="font-semibold tabular-nums mt-1">{previewLib.occupied}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="label-mono">Occupancy</p>
                  <p className="font-semibold tabular-nums mt-1">{previewLib.pct}%</p>
                </div>
              </div>

              <div className="mt-4">
                <SeatLegend />
              </div>

              <div className="mt-3">
                <SeatGrid
                  seats={generateSeats(previewLib.floor, Math.min(60, Math.max(20, previewLib.capacity)))}
                  cols={10}
                />
              </div>

              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/libraries/$libraryId" params={{ libraryId: previewLib.id }}>Open details</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={closePreview}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SortableTh({
  label, k, sortKey, sortDir, onSort, align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === k;
  return (
    <th className={`px-3 ${align === "right" ? "text-right" : ""}`}>
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
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
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
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
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No options</p>
          ) : options.map((o) => (
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
