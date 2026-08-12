import { useMemo, useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { institutionLibrariesQuery, institutionBranchesQuery } from "@/lib/services";
import { GlassCard, SectionHeader, EmptyState } from "@/components/page-header";
import { InlineEmpty } from "./empty-state";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Library as LibraryIcon, Users, Activity, AlertTriangle, Plus, Search, X } from "lucide-react";

const STATUSES = ["all", "Active", "Maintenance", "Closed"] as const;

export function LibrariesTab({ institutionId }: { institutionId: string }) {
  const { data: libraries } = useSuspenseQuery(institutionLibrariesQuery(institutionId));
  const { data: branches } = useSuspenseQuery(institutionBranchesQuery(institutionId));
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;

  const [q, setQ] = useState(search.lq ?? "");
  useEffect(() => { setQ(search.lq ?? ""); }, [search.lq]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.lq ?? "") !== q)
        navigate({ search: (p: any) => ({ ...p, lq: q || undefined }), replace: true });
    }, 200);
    return () => clearTimeout(t);
  }, [q, search.lq, navigate]);

  const branchFilter = search.lbranch ?? "all";
  const floorFilter = search.lfloor;
  const statusFilter = (search.lstatus ?? "all") as (typeof STATUSES)[number];

  const setBranch = (v: string) => navigate({ search: (p: any) => ({ ...p, lbranch: v === "all" ? undefined : v }), replace: true });
  const setFloor = (f: number | undefined) => navigate({ search: (p: any) => ({ ...p, lfloor: f }), replace: true });
  const setStatus = (s: (typeof STATUSES)[number]) => navigate({ search: (p: any) => ({ ...p, lstatus: s === "all" ? undefined : s }), replace: true });
  const clearAll = () => { setQ(""); navigate({ search: (p: any) => ({ ...p, lq: undefined, lbranch: undefined, lfloor: undefined, lstatus: undefined }), replace: true }); };

  const floors = useMemo(() => Array.from(new Set(libraries.map((l: any) => l.floor ?? 1))).sort((a, b) => Number(a) - Number(b)), [libraries]);

  const filtered = useMemo(() => {
    const needle = (search.lq ?? "").trim().toLowerCase();
    return libraries.filter((l: any) => {
      if (needle && ![l.name, l.branchName].some((v: any) => (v ?? "").toLowerCase().includes(needle))) return false;
      if (branchFilter !== "all" && l.branch_id !== branchFilter) return false;
      if (floorFilter != null && (l.floor ?? 1) !== floorFilter) return false;
      if (statusFilter !== "all" && (l.status ?? "Active") !== statusFilter) return false;
      return true;
    });
  }, [libraries, search.lq, branchFilter, floorFilter, statusFilter]);

  const totalSeats = libraries.reduce((s: number, l: any) => s + (l.capacity ?? 0), 0);
  const totalOcc = libraries.reduce((s: number, l: any) => s + (l._occupied ?? 0), 0);
  const avgOcc = totalSeats ? Math.round((totalOcc / totalSeats) * 100) : 0;
  const atCap = libraries.filter((l: any) => l.capacity && (l._occupied / l.capacity) >= 0.95).length;
  const hasFilters = !!(search.lq || search.lbranch || search.lfloor != null || search.lstatus);

  if (libraries.length === 0) {
    return (
      <EmptyState
        icon={<LibraryIcon className="h-5 w-5" />}
        title="No libraries yet"
        description="Add libraries to your branches to start managing seats and zones."
        action={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add library</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Libraries" value={libraries.length} icon={<LibraryIcon className="h-4 w-4" />} hint="across branches" index={0} />
        <KpiCard label="Total seats" value={totalSeats.toLocaleString()} icon={<Users className="h-4 w-4" />} hint="capacity" index={1} />
        <KpiCard label="Avg occupancy" value={`${avgOcc}%`} icon={<Activity className="h-4 w-4" />} hint="today" index={2} />
        <KpiCard label="At capacity" value={atCap} icon={<AlertTriangle className="h-4 w-4" />} hint="≥ 95% full" index={3} />
      </section>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search libraries or branches…" className="pl-8 h-9" />
          </div>
          <Select value={branchFilter} onValueChange={setBranch}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={floorFilter == null ? "default" : "outline"} className="cursor-pointer" onClick={() => setFloor(undefined)}>All floors</Badge>
            {floors.map((f: any) => (
              <Badge key={f} variant={floorFilter === f ? "default" : "outline"} className="cursor-pointer" onClick={() => setFloor(f)}>F{f}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Badge key={s} variant={statusFilter === s ? "default" : "outline"} className="cursor-pointer" onClick={() => setStatus(s)}>{s === "all" ? "Any" : s}</Badge>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{filtered.length} / {libraries.length}</span>
            {hasFilters && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={clearAll}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title={`${filtered.length} libraries`} description="Live capacity by floor and branch" actions={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Add library</Button>} />
        {filtered.length === 0 ? (
          <InlineEmpty
            icon={<Search className="h-4 w-4" />}
            title="No libraries match your filters"
            action={<Button size="sm" variant="outline" onClick={clearAll}>Clear filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((l: any) => {
              const seats = l._seatCount || l.capacity || 0;
              const occ = l._occupied || 0;
              const pct = seats > 0 ? Math.round((occ / seats) * 100) : 0;
              const st = l.status ?? "Active";
              return (
                <div key={l.id} className="rounded-lg border p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{l.name}</div>
                      <div className="label-mono mt-0.5 truncate">{l.branchName || "—"} · Floor {l.floor ?? 1}</div>
                    </div>
                    <Badge variant={st === "Active" ? "default" : st === "Maintenance" ? "secondary" : "destructive"} className="shrink-0">{st}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Occupancy</span>
                      <span className="tabular-nums">{occ}/{seats}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="label-mono">{l.operating_start ? `${l.operating_start}–${l.operating_end ?? "—"}` : "Hours not set"}</span>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Manage</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
