import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader, GlassCard } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Download, Users, AlertCircle, Crown,
  LayoutGrid, List, MoreHorizontal, Eye, Mail, Edit, Copy, PanelRightOpen,
  Filter, X, ChevronDown, ArrowUp, ArrowDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CalendarClock, BellRing, RotateCcw,
} from "lucide-react";
import { listPeople } from "@/lib/people.functions";
import {
  DEMO_MEMBERS, memberLifecycle, LIFECYCLE_OPTS, renewMember,
  type DemoMember, type Lifecycle, type LifecycleTone,
} from "@/lib/mock/members-demo";
import { RenewPlanDialog, type RenewTarget } from "@/components/renew-plan-dialog";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/members/")({
  head: () => ({ meta: [{ title: "Members — SmartLibrary" }] }),
  component: MembersIndex,
});

const STATUS_OPTS = ["Active", "Inactive", "Suspended"] as const;
const PLAN_OPTS = ["Basic", "Plus", "Pro", "Annual"] as const;
const TIER_OPTS = ["Standard", "Premium", "Elite"] as const;
const PAGE_SIZE_OPTS = [10, 25, 50, 100] as const;
const STORAGE_KEY = "members:filters:v2";

const tierOf = (plan: string): (typeof TIER_OPTS)[number] =>
  plan === "Annual" ? "Elite" : plan === "Pro" ? "Premium" : "Standard";

type SortKey = "name" | "status" | "membership" | "shift" | "branch" | "attendance_rate" | "fees_owed" | "join_date" | "plan_expiry";
type SortDir = "asc" | "desc";
type Filters = {
  q: string;
  statuses: string[];
  plans: string[];
  tiers: string[];
  branches: string[];
  lifecycles: string[];
  needsAction: boolean;
  view: "table" | "grid";
  sortKey: SortKey;
  sortDir: SortDir;
  pageSize: number;
};
const DEFAULT_FILTERS: Filters = {
  q: "", statuses: [], plans: [], tiers: [], branches: [], lifecycles: [], needsAction: false,
  view: "table", sortKey: "name", sortDir: "asc", pageSize: 25,
};

type MemberRow = DemoMember & { life: Lifecycle };

function MembersIndex() {
  const fetch = useServerFn(listPeople);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["members", "list"],
    queryFn: () => fetch({ data: { kind: "members" } }).catch(() => [] as any[]),
    retry: false,
  });

  const [renewTick, setRenewTick] = useState(0);
  const [renewTarget, setRenewTarget] = useState<RenewTarget | null>(null);
  useEffect(() => {
    const h = () => setRenewTick(t => t + 1);
    window.addEventListener("members:renewals", h);
    return () => window.removeEventListener("members:renewals", h);
  }, []);

  const members: MemberRow[] = useMemo(() => {
    const backend = rows as any[];
    const mapped: DemoMember[] = backend.map((r, i) => ({
      id: r.id, name: r.name ?? "—", email: r.email ?? "—", phone: r.phone ?? "—",
      status: (r.status ?? "Active") as any, shift: (r.shift ?? "Morning") as any,
      membership: "Basic" as any, branch: "—", library: "—",
      seat: r.seat_id?.slice(0, 6) ?? "—", fees_owed: Number(r.fees_owed ?? 0),
      attendance_rate: 70 + (i % 25),
      join_date: r.join_date ?? new Date(r.created_at ?? Date.now()).toISOString().slice(0, 10),
      plan_expiry: r.plan_expiry ?? new Date(Date.now() + ((i % 6) - 1) * 15 * 86400000).toISOString().slice(0, 10),
      last_visit: new Date().toISOString().slice(0, 10),
      visits_30d: 8 + (i % 20), avatar_hue: (i * 41) % 360,
    }));
    const existing = new Set(mapped.map(m => m.id));
    const all = [...mapped, ...DEMO_MEMBERS.filter(d => !existing.has(d.id))];
    return all.map(m => ({ ...m, life: memberLifecycle(m) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, renewTick]);

  const branchOptions = useMemo(
    () => Array.from(new Set(members.map(m => m.branch).filter(b => b && b !== "—"))).sort(),
    [members]
  );

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [hydrated, setHydrated] = useState(false);
  const [quickId, setQuickId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters, hydrated]);

  const update = (patch: Partial<Filters>) => setFilters(f => ({ ...f, ...patch }));
  const toggleIn = (key: "statuses" | "plans" | "tiers" | "branches" | "lifecycles", v: string) =>
    setFilters(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const { q, statuses, plans, tiers, branches, lifecycles, needsAction, view, sortKey, sortDir, pageSize } = filters;

  const filtered = useMemo(() => members.filter(m =>
    (statuses.length === 0 || statuses.includes(m.status)) &&
    (plans.length === 0 || plans.includes(m.membership)) &&
    (tiers.length === 0 || tiers.includes(tierOf(m.membership))) &&
    (branches.length === 0 || branches.includes(m.branch)) &&
    (lifecycles.length === 0 || lifecycles.includes(m.life.state)) &&
    (!needsAction || m.life.needsAction) &&
    (q === "" ||
      m.name.toLowerCase().includes(q.toLowerCase()) ||
      m.email.toLowerCase().includes(q.toLowerCase()) ||
      m.phone.includes(q))
  ), [members, q, statuses, plans, tiers, branches, lifecycles, needsAction]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const av = (sortKey === "plan_expiry" ? a.life.expiry : a[sortKey]) as any;
      const bv = (sortKey === "plan_expiry" ? b.life.expiry : b[sortKey]) as any;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Reset page on filter/sort change
  useEffect(() => { setPage(1); }, [q, statuses, plans, tiers, branches, lifecycles, needsAction, sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = sorted.slice(pageStart, pageStart + pageSize);

  const onSort = (key: SortKey) => setFilters(f => ({
    ...f,
    sortKey: key,
    sortDir: f.sortKey === key ? (f.sortDir === "asc" ? "desc" : "asc") : "asc",
  }));

  const active = members.filter(m => m.status === "Active").length;
  const expiringSoon = members.filter(m => m.life.state === "Expiring soon" || m.life.state === "Grace").length;
  const expired = members.filter(m => m.life.state === "Expired").length;
  const actionCount = members.filter(m => m.life.needsAction).length;
  const feesDue = members.reduce((s, m) => s + m.fees_owed, 0);
  const premium = members.filter(m => m.membership === "Pro" || m.membership === "Annual").length;
  const activeFilterCount = statuses.length + plans.length + tiers.length + branches.length + lifecycles.length + (needsAction ? 1 : 0) + (q ? 1 : 0);

  const onRenew = (m: MemberRow) =>
    setRenewTarget({
      id: m.id, name: m.name, membership: m.membership,
      expiry: m.life.expiry, daysLeft: m.life.daysLeft, feesOwed: m.fees_owed,
    });

  const confirmRenew = (t: RenewTarget) => {
    const next = renewMember(t.id, t.membership);
    setRenewTarget(null);
    toast.success(`${t.name} renewed`, { description: `${t.membership} plan now valid until ${next}` });
  };



  const copyId = (id: string) => {
    navigator.clipboard.writeText(id).then(
      () => toast.success("Member ID copied", { description: id }),
      () => toast.error("Copy failed")
    );
  };

  const quickMember = quickId ? members.find(m => m.id === quickId) : null;

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Members"
        description={`${members.length.toLocaleString()} total · ${active} active · ${actionCount} need action`}
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
            <Button size="sm" asChild><Link to="/members/create"><Plus className="h-4 w-4 mr-1" /> Add member</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KpiCard label="Active" value={active.toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Expiring ≤ 7d" value={expiringSoon.toLocaleString()} icon={<CalendarClock className="h-4 w-4" />} />
        <KpiCard label="Expired" value={expired.toLocaleString()} icon={<BellRing className="h-4 w-4" />} />
        <KpiCard label="Fees due" value={`₹${feesDue.toLocaleString()}`} icon={<AlertCircle className="h-4 w-4" />} />
        <KpiCard label="Premium" value={premium.toLocaleString()} icon={<Crown className="h-4 w-4" />} />
      </div>

      {actionCount > 0 && !needsAction && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm">
          <BellRing className="h-4 w-4 text-warning-foreground" />
          <span className="text-warning-foreground">
            <b className="tabular-nums">{actionCount}</b> membership{actionCount === 1 ? "" : "s"} need attention — {expired} expired, {expiringSoon} expiring within 7 days.
          </span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => update({ needsAction: true })}>Review now</Button>
        </div>
      )}

      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search name, email, phone…" value={q} onChange={(e) => update({ q: e.target.value })} />
          </div>

          <MultiFilter label="Status" selected={statuses} options={STATUS_OPTS as unknown as string[]} onToggle={(v) => toggleIn("statuses", v)} onClear={() => update({ statuses: [] })} />
          <MultiFilter label="Membership" selected={lifecycles} options={LIFECYCLE_OPTS as unknown as string[]} onToggle={(v) => toggleIn("lifecycles", v)} onClear={() => update({ lifecycles: [] })} />
          <MultiFilter label="Branch" selected={branches} options={branchOptions} onToggle={(v) => toggleIn("branches", v)} onClear={() => update({ branches: [] })} />
          <MultiFilter label="Plan" selected={plans} options={PLAN_OPTS as unknown as string[]} onToggle={(v) => toggleIn("plans", v)} onClear={() => update({ plans: [] })} />
          <MultiFilter label="Tier" selected={tiers} options={TIER_OPTS as unknown as string[]} onToggle={(v) => toggleIn("tiers", v)} onClear={() => update({ tiers: [] })} />

          <Button
            size="sm"
            variant={needsAction ? "default" : "outline"}
            className="h-9"
            onClick={() => update({ needsAction: !needsAction })}
          >
            <BellRing className="h-3.5 w-3.5 mr-1" /> Needs action
            <span className="ml-1.5 rounded bg-foreground/10 text-[10px] px-1.5 py-0.5 tabular-nums">{actionCount}</span>
          </Button>

          {activeFilterCount > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setFilters({ ...DEFAULT_FILTERS, view, sortKey, sortDir, pageSize })}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear all
            </Button>
          )}

          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => update({ view: "table" })}><List className="h-4 w-4" /></Button>
            <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => update({ view: "grid" })}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {q && <FilterChip label={`"${q}"`} onRemove={() => update({ q: "" })} />}
            {needsAction && <FilterChip label="Needs action" onRemove={() => update({ needsAction: false })} />}
            {statuses.map(s => <FilterChip key={s} label={`Status: ${s}`} onRemove={() => toggleIn("statuses", s)} />)}
            {lifecycles.map(l => <FilterChip key={l} label={`Membership: ${l}`} onRemove={() => toggleIn("lifecycles", l)} />)}
            {branches.map(b => <FilterChip key={b} label={`Branch: ${b}`} onRemove={() => toggleIn("branches", b)} />)}
            {plans.map(p => <FilterChip key={p} label={`Plan: ${p}`} onRemove={() => toggleIn("plans", p)} />)}
            {tiers.map(t => <FilterChip key={t} label={`Tier: ${t}`} onRemove={() => toggleIn("tiers", t)} />)}
            <span className="text-xs text-muted-foreground ml-1 self-center">{sorted.length} match{sorted.length === 1 ? "" : "es"}</span>
          </div>
        )}


        <div className="mt-4">
          {isLoading && <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>}

          {!isLoading && view === "table" && (
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-y label-mono bg-muted/30">
                    <SortableTh label="Member" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-4 py-2" />
                    <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-2 py-2" />
                    <SortableTh label="Plan" k="membership" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-2 py-2" />
                    <SortableTh label="Expires" k="plan_expiry" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-2 py-2" />
                    <th className="px-2 py-2 font-medium">Action required</th>
                    <SortableTh label="Shift" k="shift" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-2 py-2" />
                    <SortableTh label="Branch" k="branch" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-2 py-2" />
                    <SortableTh label="Attendance" k="attendance_rate" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-2 py-2" />
                    <SortableTh label="Fees" k="fees_owed" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-2 py-2" />
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No members match your filters</td></tr>}
                  {paged.map(m => (
                    <tr
                      key={m.id}
                      className={cn(
                        "hover:bg-muted/40",
                        m.life.state === "Expired" && "bg-destructive/[0.04] border-l-2 border-l-destructive",
                        (m.life.state === "Expiring soon" || m.life.state === "Grace") && "border-l-2 border-l-warning",
                        m.life.state === "New" && "border-l-2 border-l-info",
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <Link to="/members/$memberId" params={{ memberId: m.id }} className="flex items-center gap-2 group">
                          <Avatar className="h-8 w-8" style={{ background: `hsl(${m.avatar_hue} 60% 45%)` }}>
                            <AvatarFallback className="text-xs bg-transparent text-white">{m.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium group-hover:text-primary">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-2.5"><StatusBadge status={m.status} /></td>
                      <td className="px-2 py-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          <PlanBadge plan={m.membership} />
                          <LifecycleBadge life={m.life} />
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-xs tabular-nums">
                        <div className="whitespace-nowrap">{m.life.expiry}</div>
                        <div className={cn("text-[11px]", m.life.daysLeft < 0 ? "text-destructive" : m.life.daysLeft <= 7 ? "text-warning-foreground" : "text-muted-foreground")}>
                          {m.life.relative}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        {m.life.action
                          ? <ActionPill tone={m.life.tone} label={m.life.action} />
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{m.shift}</td>
                      <td className="px-2 py-2.5 text-muted-foreground text-xs">{m.branch}</td>
                      <td className="px-2 py-2.5 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full", m.attendance_rate >= 80 ? "bg-emerald-500" : m.attendance_rate >= 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${m.attendance_rate}%` }} />
                          </div>
                          <span className="text-xs tabular-nums w-8 text-right">{m.attendance_rate}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-xs tabular-nums">
                        {m.fees_owed > 0 ? <span className="text-rose-500">₹{m.fees_owed.toLocaleString()}</span> : <span className="text-muted-foreground">Clear</span>}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-0.5">
                          {m.life.needsAction && m.life.state !== "New" && (
                            <Button variant="outline" size="sm" className="h-8 mr-1" onClick={() => onRenew(m)}>
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Renew
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy member ID" onClick={() => copyId(m.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Quick view" onClick={() => setQuickId(m.id)}>
                            <PanelRightOpen className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem asChild>
                                <Link to="/members/$memberId" params={{ memberId: m.id }} className="flex items-center gap-2 cursor-pointer">
                                  <Eye className="h-4 w-4" /> View profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onRenew(m)}><RotateCcw className="h-4 w-4 mr-2" /> Renew plan</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setQuickId(m.id)}><PanelRightOpen className="h-4 w-4 mr-2" /> Quick view</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyId(m.id)}><Copy className="h-4 w-4 mr-2" /> Copy ID</DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to="/members/$memberId" params={{ memberId: m.id }} className="flex items-center gap-2 cursor-pointer">
                                  <Edit className="h-4 w-4" /> Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Send message</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && view === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paged.length === 0 && (
                <div className="col-span-full py-8 text-center text-muted-foreground text-sm">No members match your filters</div>
              )}
              {paged.map(m => (
                <div
                  key={m.id}
                  className={cn(
                    "border rounded-lg p-4 hover:border-primary/60 hover:bg-muted/30 transition group relative",
                    m.life.state === "Expired" && "border-destructive/40",
                    (m.life.state === "Expiring soon" || m.life.state === "Grace") && "border-warning/40",
                  )}
                >
                  <Link to="/members/$memberId" params={{ memberId: m.id }} className="absolute inset-0 rounded-lg" aria-label={m.name} />
                  <div className="flex items-center gap-3 relative pointer-events-none">
                    <Avatar className="h-11 w-11" style={{ background: `hsl(${m.avatar_hue} 60% 45%)` }}>
                      <AvatarFallback className="bg-transparent text-white">{m.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate group-hover:text-primary">{m.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    </div>
                    <PlanBadge plan={m.membership} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 relative pointer-events-none">
                    <StatusBadge status={m.status} />
                    <LifecycleBadge life={m.life} />
                    <span className="text-xs text-muted-foreground">· {m.shift} · {m.branch}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs relative pointer-events-none">
                    <span className="text-muted-foreground">Expires {m.life.expiry}</span>
                    <span className={cn(m.life.daysLeft < 0 ? "text-destructive" : m.life.daysLeft <= 7 ? "text-warning-foreground" : "text-muted-foreground")}>{m.life.relative}</span>
                  </div>
                  {m.life.action && (
                    <div className="mt-2 relative pointer-events-none"><ActionPill tone={m.life.tone} label={m.life.action} /></div>
                  )}
                  <div className="mt-3 relative pointer-events-none">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Attendance</span><span className="tabular-nums">{m.attendance_rate}%</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full", m.attendance_rate >= 80 ? "bg-emerald-500" : m.attendance_rate >= 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${m.attendance_rate}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between relative">
                    <span className="text-xs text-muted-foreground pointer-events-none">Last visit {m.last_visit}</span>
                    <div className="flex gap-1 relative z-10">
                      {m.life.needsAction && m.life.state !== "New" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.preventDefault(); onRenew(m); }}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Renew</Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy ID" onClick={(e) => { e.preventDefault(); copyId(m.id); }}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Quick view" onClick={(e) => { e.preventDefault(); setQuickId(m.id); }}><PanelRightOpen className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}

          {!isLoading && sorted.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t">
              <div className="text-xs text-muted-foreground">
                Showing <span className="tabular-nums font-medium text-foreground">{pageStart + 1}–{Math.min(pageStart + pageSize, sorted.length)}</span> of <span className="tabular-nums font-medium text-foreground">{sorted.length}</span>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Rows</span>
                  <select
                    className="h-8 rounded border bg-background px-1.5 text-xs"
                    value={pageSize}
                    onChange={(e) => update({ pageSize: Number(e.target.value) })}
                  >
                    {PAGE_SIZE_OPTS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-xs tabular-nums px-2 min-w-[80px] text-center">Page {currentPage} / {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <Sheet open={!!quickId} onOpenChange={(o) => !o && setQuickId(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {quickMember && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-11 w-11" style={{ background: `hsl(${quickMember.avatar_hue} 60% 45%)` }}>
                    <AvatarFallback className="bg-transparent text-white">{quickMember.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div>{quickMember.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{quickMember.email}</div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2"><StatusBadge status={quickMember.status} /><PlanBadge plan={quickMember.membership} /><LifecycleBadge life={quickMember.life} /><span className="text-xs px-2 py-0.5 rounded border bg-muted/50">{quickMember.shift}</span></div>
                {quickMember.life.action && (
                  <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
                    <div className="label-mono text-[10px] text-warning-foreground">Action required</div>
                    <div className="text-sm mt-0.5">{quickMember.life.action}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <QuickStat label="Plan expires" value={quickMember.life.expiry} />
                  <QuickStat label="Days left" value={quickMember.life.relative} />
                  <QuickStat label="Attendance" value={`${quickMember.attendance_rate}%`} />
                  <QuickStat label="Visits · 30d" value={quickMember.visits_30d.toString()} />
                  <QuickStat label="Fees due" value={quickMember.fees_owed > 0 ? `₹${quickMember.fees_owed.toLocaleString()}` : "Clear"} />
                  <QuickStat label="Seat" value={quickMember.seat} />
                  <QuickStat label="Branch" value={quickMember.branch} />
                  <QuickStat label="Library" value={quickMember.library} />
                  <QuickStat label="Phone" value={quickMember.phone} />
                  <QuickStat label="Joined" value={quickMember.join_date} />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => copyId(quickMember.id)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy ID</Button>
                  {quickMember.life.needsAction && quickMember.life.state !== "New" && (
                    <Button size="sm" variant="outline" onClick={() => onRenew(quickMember)}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Renew</Button>
                  )}
                  <Button size="sm" asChild className="flex-1"><Link to="/members/$memberId" params={{ memberId: quickMember.id }}>Open full profile</Link></Button>
                </div>

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <RenewPlanDialog
        target={renewTarget}
        onOpenChange={(o) => { if (!o) setRenewTarget(null); }}
        onConfirm={confirmRenew}
      />
    </>
  );
}

function SortableTh({ label, k, sortKey, sortDir, onSort, className }: { label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void; className?: string }) {
  const active = sortKey === k;
  const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("font-medium select-none", className)}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground transition", active ? "text-foreground" : "text-muted-foreground")}
      >
        {label}
        <Icon className={cn("h-3 w-3", active ? "opacity-100" : "opacity-50")} />
      </button>
    </th>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md p-2">
      <div className="label-mono text-[10px]">{label}</div>
      <div className="text-sm truncate">{value}</div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-muted/50">
      {label}
      <button onClick={onRemove} className="hover:text-foreground text-muted-foreground"><X className="h-3 w-3" /></button>
    </span>
  );
}

function MultiFilter({ label, options, selected, onToggle, onClear }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; onClear: () => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-9">
          <Filter className="h-3.5 w-3.5 mr-1" /> {label}
          {selected.length > 0 && <span className="ml-1.5 rounded bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 tabular-nums">{selected.length}</span>}
          <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2 max-h-72 overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="label-mono">{label}</span>
          {selected.length > 0 && <button className="text-xs text-muted-foreground hover:text-foreground" onClick={onClear}>Clear</button>}
        </div>
        <div className="space-y-0.5">
          {options.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No options</div>}
          {options.map(o => (
            <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
              <span className="truncate">{o}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    Basic: "bg-slate-500/15 text-slate-500 border-slate-500/30",
    Plus: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    Pro: "bg-violet-500/15 text-violet-500 border-violet-500/30",
    Annual: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  };
  return <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium", styles[plan] ?? styles.Basic)}>{plan}</span>;
}

const TONE_STYLES: Record<LifecycleTone, string> = {
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/10 text-info border-info/25",
  muted: "bg-muted text-muted-foreground border-border",
};

function LifecycleBadge({ life }: { life: Lifecycle }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap", TONE_STYLES[life.tone])}>
      <CalendarClock className="h-3 w-3" />
      {life.state}
    </span>
  );
}

function ActionPill({ tone, label }: { tone: LifecycleTone; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap", TONE_STYLES[tone])}>
      <BellRing className="h-3 w-3" />
      {label}
    </span>
  );
}
