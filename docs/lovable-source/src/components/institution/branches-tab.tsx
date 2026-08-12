import { useMemo, useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { institutionBranchesQuery } from "@/lib/services";
import { GlassCard, SectionHeader, EmptyState } from "@/components/page-header";
import { InlineEmpty } from "./empty-state";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Users, Activity, AlertTriangle, Plus, Search, X, MapPin, ArrowUpRight, MoreHorizontal } from "lucide-react";

type StatusFilter = "all" | "Active" | "Maintenance" | "Closed";
type CapFilter = "any" | "small" | "mid" | "large";

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "Active", label: "Active" },
  { value: "Maintenance", label: "Maintenance" }, { value: "Closed", label: "Closed" },
];
const CAPS: { value: CapFilter; label: string }[] = [
  { value: "any", label: "Any size" }, { value: "small", label: "< 50" },
  { value: "mid", label: "50–150" }, { value: "large", label: "150+" },
];

function matchCap(cap: number, f: CapFilter) {
  if (f === "small") return cap < 50;
  if (f === "mid") return cap >= 50 && cap < 150;
  if (f === "large") return cap >= 150;
  return true;
}

export function BranchesTab({ institutionId }: { institutionId: string }) {
  const { data: branches } = useSuspenseQuery(institutionBranchesQuery(institutionId));
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;

  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== q)
        navigate({ search: (prev: any) => ({ ...prev, q: q || undefined }), replace: true });
    }, 200);
    return () => clearTimeout(t);
  }, [q, search.q, navigate]);

  const status: StatusFilter = (search.status as StatusFilter) ?? "all";
  const cap: CapFilter = (search.cap as CapFilter) ?? "any";

  const setStatus = (s: StatusFilter) => navigate({ search: (p: any) => ({ ...p, status: s === "all" ? undefined : s }), replace: true });
  const setCap = (c: CapFilter) => navigate({ search: (p: any) => ({ ...p, cap: c === "any" ? undefined : c }), replace: true });
  const clearAll = () => { setQ(""); navigate({ search: (p: any) => ({ ...p, q: undefined, status: undefined, cap: undefined }), replace: true }); };

  const filtered = useMemo(() => {
    const needle = (search.q ?? "").trim().toLowerCase();
    return branches.filter((b: any) => {
      if (needle && ![b.name, b.city, b.address].some((v: any) => (v ?? "").toLowerCase().includes(needle))) return false;
      if (status !== "all" && (b.status ?? "Active") !== status) return false;
      if (!matchCap(b.capacity ?? 0, cap)) return false;
      return true;
    });
  }, [branches, search.q, status, cap]);

  const totalCap = branches.reduce((s: number, b: any) => s + (b.capacity ?? 0), 0);
  const avgOcc = branches.length
    ? Math.round(branches.reduce((s: number, b: any) => s + b.occupancyPct, 0) / branches.length) : 0;
  const nearCap = branches.filter((b: any) => b.occupancyPct >= 80).length;
  const sorted = [...branches].sort((a, b) => b.occupancyPct - a.occupancyPct);
  const top = sorted[0];
  const attention = [...branches].sort((a, b) => a.occupancyPct - b.occupancyPct).slice(0, 3);

  const hasFilters = !!(search.q || search.status || search.cap);

  if (branches.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-5 w-5" />}
        title="No branches yet"
        description="Branches let you organize libraries and members by physical location."
        action={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add branch</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total branches" value={branches.length} icon={<Building2 className="h-4 w-4" />} hint="active" index={0} />
        <KpiCard label="Total capacity" value={totalCap.toLocaleString()} icon={<Users className="h-4 w-4" />} hint="seats" index={1} />
        <KpiCard label="Avg occupancy" value={`${avgOcc}%`} icon={<Activity className="h-4 w-4" />} hint="today" index={2} />
        <KpiCard label="Near capacity" value={nearCap} icon={<AlertTriangle className="h-4 w-4" />} hint="≥ 80% full" index={3} />
      </section>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, city or address…"
              className="pl-8 h-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Badge key={s.value} variant={status === s.value ? "default" : "outline"} className="cursor-pointer" onClick={() => setStatus(s.value)}>{s.label}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CAPS.map((c) => (
              <Badge key={c.value} variant={cap === c.value ? "default" : "outline"} className="cursor-pointer" onClick={() => setCap(c.value)}>{c.label}</Badge>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{filtered.length} / {branches.length}</span>
            {hasFilters && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={clearAll}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionHeader title="All branches" description="Live capacity and status" actions={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Add branch</Button>} />
          {filtered.length === 0 ? (
            <InlineEmpty
              icon={<Search className="h-4 w-4" />}
              title="No branches match your filters"
              description="Try clearing search or filters to see all branches."
              action={<Button size="sm" variant="outline" onClick={clearAll}>Clear filters</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-y label-mono">
                    <th className="py-2">Branch</th>
                    <th>Contact</th>
                    <th className="text-right">Capacity</th>
                    <th>Occupancy</th>
                    <th className="text-right">Libs</th>
                    <th className="text-right">Members</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((b: any) => {
                    const st = b.status ?? "Active";
                    return (
                      <tr key={b.id} className="hover:bg-muted/40">
                        <td className="py-2.5">
                          <Link to="/institutions/$institutionId/branches/$branchId" params={{ institutionId, branchId: b.id }} className="font-medium hover:text-primary">{b.name}</Link>
                          <div className="label-mono flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{b.city ?? "—"}</div>
                        </td>
                        <td className="text-muted-foreground text-xs">{b.email ?? b.phone ?? "—"}</td>
                        <td className="text-right tabular-nums">{(b.capacity ?? 0).toLocaleString()}</td>
                        <td className="min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <Progress value={b.occupancyPct} className="h-1.5" />
                            <span className="tabular-nums text-xs w-9 text-right">{b.occupancyPct}%</span>
                          </div>
                        </td>
                        <td className="text-right tabular-nums">{b.libraryCount}</td>
                        <td className="text-right tabular-nums">{b.memberCount}</td>
                        <td>
                          <Badge variant={st === "Active" ? "default" : st === "Maintenance" ? "secondary" : "destructive"}>{st}</Badge>
                        </td>
                        <td className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <SectionHeader title="Top performer" description="By occupancy" />
            {top ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{top.name}</p>
                    <p className="label-mono">{top.city ?? "—"}</p>
                  </div>
                  <Badge className="gap-1"><ArrowUpRight className="h-3 w-3" />{top.occupancyPct}%</Badge>
                </div>
                <Progress value={top.occupancyPct} />
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div><p className="text-sm font-semibold tabular-nums">{top.memberCount}</p><p className="label-mono">Members</p></div>
                  <div><p className="text-sm font-semibold tabular-nums">{top.libraryCount}</p><p className="label-mono">Libraries</p></div>
                  <div><p className="text-sm font-semibold tabular-nums">{top.capacity ?? 0}</p><p className="label-mono">Seats</p></div>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </GlassCard>

          <GlassCard className="p-5">
            <SectionHeader title="Needs attention" description="Lowest occupancy" />
            <ul className="space-y-2">
              {attention.map((b: any) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="label-mono">{b.city ?? "—"}</p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">{b.occupancyPct}%</Badge>
                </li>
              ))}
              {attention.length === 0 && <li className="text-sm text-muted-foreground">All branches healthy.</li>}
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
