import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AreaTrend } from "@/components/charts";
import { plans, payments, members, revenueTrend } from "@/lib/mock/data";
import {
  Check, Sparkles, Crown, Rocket, Building2, Search, Download,
  TrendingUp, ArrowUpRight, MoreHorizontal, Pause, Play, X as XIcon,
  Receipt, ArrowRight, Filter, CalendarIcon, Bell, Mail, MessageSquare,
  Loader2, AlertCircle, History, FileDown, ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscriptions/")({
  head: () => ({ meta: [{ title: "Subscriptions — SmartLibrary" }] }),
  component: SubscriptionsPage,
});

type Cycle = "Monthly" | "Annually";
type SubStatus = "Active" | "Trialing" | "Paused" | "Past due" | "Canceled";

const ALL_STATUSES: SubStatus[] = ["Active", "Trialing", "Paused", "Past due", "Canceled"];

type InvStatus = "Paid" | "Unpaid" | "Refunded" | "Void";
type ActivityEntry = {
  id: string;
  ts: number;
  type: "created" | "status" | "plan" | "invoice" | "renewed";
  message: string;
  actor?: string;
};
type RowState = { pending?: boolean; error?: boolean };
type LastAction = { next: SubStatus; label: string };

type Sub = {
  id: string;
  member: string;
  email: string;
  planId: string;
  plan: string;
  amount: number;
  cycle: "Monthly" | "Annually";
  method: string;
  status: SubStatus;
  renews: string; // YYYY-MM-DD
};

const planIcon = (id: string) => {
  if (id.includes("starter")) return Rocket;
  if (id.includes("growth")) return Sparkles;
  if (id.includes("pro")) return Crown;
  return Building2;
};

function formatINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toLocaleString()}`;
}

function statusVariant(s: SubStatus): "default" | "secondary" | "destructive" | "outline" {
  if (s === "Active") return "default";
  if (s === "Trialing") return "secondary";
  if (s === "Past due") return "destructive";
  return "outline";
}

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function downloadInvoice(sub: Sub, inv: { id: string; date: string; amount: number; status: string }) {
  const body = [
    `INVOICE ${inv.id}`,
    `Date: ${inv.date}`,
    ``,
    `Bill to: ${sub.member} <${sub.email}>`,
    `Plan: ${sub.plan} (${sub.cycle})`,
    ``,
    `Amount: ${formatINR(inv.amount)}`,
    `Status: ${inv.status}`,
    ``,
    `Thank you for your business.`,
  ].join("\n");
  const blob = new Blob([body], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function SubscriptionsPage() {
  const [cycle, setCycle] = useState<Cycle>("Monthly");
  const [query, setQuery] = useState("");

  const trend = useMemo(() => revenueTrend(30), []);

  // Build initial subs once, then keep mutable state for actions
  const initialSubs = useMemo<Sub[]>(() => {
    return members.slice(0, 20).map((m, i) => {
      const plan = plans[i % plans.length];
      const pay = payments[i % payments.length];
      const renewDate = new Date();
      renewDate.setDate(renewDate.getDate() + ((i * 3) % 28) - 4);
      const status = (["Active", "Active", "Active", "Past due", "Trialing", "Active", "Canceled"] as const)[i % 7];
      return {
        id: m.id,
        member: m.name,
        email: m.email,
        planId: plan.id,
        plan: plan.name,
        amount: plan.price,
        cycle: plan.billingCycle as "Monthly" | "Annually",
        method: pay.method,
        status: status as SubStatus,
        renews: renewDate.toISOString().slice(0, 10),
      };
    });
  }, []);
  const [subs, setSubs] = useState<Sub[]>(initialSubs);

  // Filters
  const [statusFilter, setStatusFilter] = useState<SubStatus[]>([]);
  const [cycleFilter, setCycleFilter] = useState<"" | "Monthly" | "Annually">("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const activeFilterCount =
    (statusFilter.length ? 1 : 0) + (cycleFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subs.filter((s) => {
      if (q && !(s.member.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.plan.toLowerCase().includes(q))) return false;
      if (statusFilter.length && !statusFilter.includes(s.status)) return false;
      if (cycleFilter && s.cycle !== cycleFilter) return false;
      if (dateFrom || dateTo) {
        const r = new Date(s.renews).getTime();
        if (dateFrom && r < dateFrom.getTime()) return false;
        if (dateTo && r > dateTo.getTime() + 86_400_000 - 1) return false;
      }
      return true;
    });
  }, [subs, query, statusFilter, cycleFilter, dateFrom, dateTo]);

  // Upcoming renewals (within 14 days, not canceled/paused)
  const upcoming = useMemo(() => {
    return subs
      .filter((s) => s.status === "Active" || s.status === "Trialing")
      .map((s) => ({ ...s, days: daysUntil(s.renews) }))
      .filter((s) => s.days >= 0 && s.days <= 14)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [subs]);

  // Reminder prefs (persisted)
  const [prefs, setPrefs] = useState({ email: true, sms: false, leadDays: "3" });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("subs.reminderPrefs");
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("subs.reminderPrefs", JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  // Row-level UI state for optimistic updates
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [lastAction, setLastAction] = useState<Record<string, LastAction>>({});

  // Activity timeline per sub
  const [activity, setActivity] = useState<Record<string, ActivityEntry[]>>(() => {
    const seed: Record<string, ActivityEntry[]> = {};
    initialSubs.forEach((s) => {
      const now = Date.now();
      seed[s.id] = [
        { id: `${s.id}-c`, ts: now - 1000 * 60 * 60 * 24 * 60, type: "created", message: `Subscribed to ${s.plan} (${s.cycle})`, actor: "System" },
        { id: `${s.id}-r`, ts: now - 1000 * 60 * 60 * 24 * 30, type: "renewed", message: `Renewal processed · ${formatINR(s.amount)}`, actor: "Billing" },
      ];
    });
    return seed;
  });
  const pushActivity = (subId: string, entry: Omit<ActivityEntry, "id" | "ts"> & { ts?: number }) => {
    setActivity((m) => {
      const id = `${subId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const next = [{ id, ts: entry.ts ?? Date.now(), ...entry } as ActivityEntry, ...(m[subId] ?? [])];
      return { ...m, [subId]: next };
    });
  };

  // Optimistic status update with retry + long-lived undo
  const UNDO_MS = 10_000;
  const FAIL_RATE = 0.12;
  const commitStatus = async (id: string, next: SubStatus, label: string) => {
    const current = subs.find((s) => s.id === id);
    if (!current) return;
    const prev = current.status;
    setSubs((arr) => arr.map((s) => (s.id === id ? { ...s, status: next } : s)));
    setRowState((m) => ({ ...m, [id]: { pending: true, error: false } }));
    setLastAction((m) => ({ ...m, [id]: { next, label } }));

    try {
      await new Promise<void>((resolve, reject) =>
        setTimeout(() => (Math.random() < FAIL_RATE ? reject(new Error("Network error")) : resolve()), 650),
      );
      setRowState((m) => ({ ...m, [id]: { pending: false, error: false } }));
      pushActivity(id, { type: "status", message: `Subscription ${label}`, actor: "You" });

      const toastId = `undo-${id}-${Date.now()}`;
      toast.dismiss(`undo-${id}`);
      toast(`Subscription ${label}`, {
        id: toastId,
        description: `Reverts to "${prev}" if you undo within ${UNDO_MS / 1000}s.`,
        duration: UNDO_MS,
        action: {
          label: "Undo",
          onClick: () => {
            setSubs((arr) => arr.map((s) => (s.id === id ? { ...s, status: prev } : s)));
            pushActivity(id, { type: "status", message: `Reverted ${label} → ${prev}`, actor: "You" });
            toast.success("Reverted");
          },
        },
      });
    } catch {
      // revert and surface retry
      setSubs((arr) => arr.map((s) => (s.id === id ? { ...s, status: prev } : s)));
      setRowState((m) => ({ ...m, [id]: { pending: false, error: true } }));
      toast.error(`Failed to ${label}`, {
        description: "We couldn't apply the change. Try again?",
        action: { label: "Retry", onClick: () => commitStatus(id, next, label) },
      });
    }
  };
  const retryRow = (id: string) => {
    const la = lastAction[id];
    if (la) commitStatus(id, la.next, la.label);
  };



  // Plan change dialog state
  const [planChangeFor, setPlanChangeFor] = useState<Sub | null>(null);
  // Invoice drawer state
  const [invoicesFor, setInvoicesFor] = useState<Sub | null>(null);
  // Cancel confirm state
  const [cancelFor, setCancelFor] = useState<Sub | null>(null);

  return (
    <TooltipProvider delayDuration={150}>
      <PageHeader
        eyebrow="Billing"
        title="Subscriptions"
        description="Available plans, MRR health, and every active subscription across your tenants."
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
            <Button size="sm"><Sparkles className="h-3.5 w-3.5 mr-1" />New plan</Button>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active subs" value="1,284" delta={2.1} />
        <KpiCard label="MRR" value="₹18.4L" delta={4.2} />
        <KpiCard label="ARR" value="₹2.2Cr" delta={6.5} />
        <KpiCard label="Churn" value="2.1%" delta={-0.4} />
      </section>

      {/* Revenue trend */}
      <GlassCard className="p-5">
        <SectionHeader
          title="Revenue · last 30 days"
          actions={
            <span className="flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3.5 w-3.5" /> +12.4% vs prev period
            </span>
          }
        />
        <AreaTrend
          data={trend}
          keys={[{ key: "revenue", label: "Revenue", color: "hsl(var(--primary))" }]}
          height={180}
        />
      </GlassCard>

      {/* Plans */}
      <SectionHeader
        title="Plans"
        actions={
          <div className="inline-flex rounded-full border bg-card p-0.5" role="group" aria-label="Billing cycle">
            {(["Monthly", "Annually"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                aria-pressed={cycle === c}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
                {c === "Annually" && <span className="ml-1.5 text-[10px] text-success">Save 20%</span>}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p, i) => {
          const Icon = planIcon(p.id);
          const popular = i === 2;
          const displayPrice =
            cycle === "Annually" ? Math.round(p.price * 12 * 0.8) : p.price;
          const perLabel = cycle === "Annually" ? "yr" : "mo";
          return (
            <GlassCard
              key={p.id}
              className={`p-6 hover-lift relative flex flex-col ${
                popular ? "border-primary/50 shadow-glow ring-1 ring-primary/20" : ""
              }`}
            >
              {popular && (
                <Badge className="absolute -top-2.5 right-4 shadow-sm">Most popular</Badge>
              )}
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                  popular ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-lg font-semibold">{p.name}</h3>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums">{formatINR(displayPrice)}</span>
                <span className="text-xs text-muted-foreground">/ {perLabel}</span>
              </div>
              {cycle === "Annually" && (
                <p className="text-[11px] text-success mt-1">Billed yearly · save {formatINR(p.price * 12 * 0.2)}</p>
              )}

              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${popular ? "text-primary" : "text-success"}`} /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5 pt-4 border-t text-xs text-muted-foreground space-y-1.5">
                <div className="flex justify-between"><span>Members</span><span className="tabular-nums text-foreground">{p.maxMembers >= 99999 ? "Unlimited" : p.maxMembers.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Seats</span><span className="tabular-nums text-foreground">{p.maxSeats >= 99999 ? "Unlimited" : p.maxSeats.toLocaleString()}</span></div>
              </div>

              <Button className="w-full mt-5" variant={popular ? "default" : "outline"}>
                Choose {p.name}
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </GlassCard>
          );
        })}
      </div>

      {/* Plan distribution */}
      <GlassCard className="p-5">
        <SectionHeader title="Plan distribution" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p, i) => {
            const pct = [42, 28, 22, 8][i] ?? 10;
            return (
              <div key={p.id} className="rounded-lg border p-3 bg-card/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="tabular-nums text-sm text-muted-foreground">{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="label-mono mt-1.5">{Math.round((1284 * pct) / 100)} active</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Renewal reminders */}
      <GlassCard className="p-5">
        <SectionHeader
          title="Upcoming renewals"
          actions={
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Bell className="h-3.5 w-3.5" /> Next 14 days
            </span>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border bg-card/40 divide-y">
            {upcoming.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No renewals in the next 14 days.</p>
            ) : (
              upcoming.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.member}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.plan} · {s.cycle}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={s.days <= 3 ? "destructive" : s.days <= 7 ? "secondary" : "outline"}
                      className="tabular-nums"
                    >
                      {s.days === 0 ? "Today" : s.days === 1 ? "Tomorrow" : `in ${s.days}d`}
                    </Badge>
                    <span className="text-sm tabular-nums font-medium w-16 text-right">{formatINR(s.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="rounded-lg border bg-card/40 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Notifications</h4>
              <p className="text-xs text-muted-foreground">How members get renewal reminders.</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pref-email" className="flex items-center gap-2 text-sm font-normal">
                <Mail className="h-4 w-4 text-muted-foreground" /> Email reminders
              </Label>
              <Switch
                id="pref-email"
                checked={prefs.email}
                onCheckedChange={(v) => { setPrefs((p) => ({ ...p, email: v })); toast.success(`Email reminders ${v ? "on" : "off"}`); }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pref-sms" className="flex items-center gap-2 text-sm font-normal">
                <MessageSquare className="h-4 w-4 text-muted-foreground" /> SMS reminders
              </Label>
              <Switch
                id="pref-sms"
                checked={prefs.sms}
                onCheckedChange={(v) => { setPrefs((p) => ({ ...p, sms: v })); toast.success(`SMS reminders ${v ? "on" : "off"}`); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Send reminder</Label>
              <Select value={prefs.leadDays} onValueChange={(v) => setPrefs((p) => ({ ...p, leadDays: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Active subscriptions table */}
      <GlassCard className="p-5">
        <SectionHeader
          title="Active subscriptions"
          actions={
            <div className="relative w-64">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search member, email, plan…"
                className="pl-8 h-8 text-sm"
              />
            </div>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Status filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Status
                {statusFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{statusFilter.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-2">
              <div className="space-y-1">
                {ALL_STATUSES.map((st) => {
                  const checked = statusFilter.includes(st);
                  return (
                    <label key={st} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setStatusFilter((cur) => (v ? [...cur, st] : cur.filter((s) => s !== st)));
                        }}
                      />
                      {st}
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Cycle filter */}
          <ToggleGroup
            type="single"
            size="sm"
            value={cycleFilter}
            onValueChange={(v) => setCycleFilter((v as "Monthly" | "Annually" | "") ?? "")}
            className="h-8"
          >
            <ToggleGroupItem value="Monthly" className="h-8 text-xs">Monthly</ToggleGroupItem>
            <ToggleGroupItem value="Annually" className="h-8 text-xs">Annually</ToggleGroupItem>
          </ToggleGroup>

          {/* Date range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {dateFrom ? format(dateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {dateTo ? format(dateTo, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setStatusFilter([]); setCycleFilter(""); setDateFrom(undefined); setDateTo(undefined); }}
            >
              Clear ({activeFilterCount})
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filtered.length} of {subs.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Renews</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No subscriptions match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => {
                  const canPause = s.status === "Active";
                  const canResume = s.status === "Paused";
                  const canCancel = s.status !== "Canceled";
                  const rs = rowState[s.id] ?? {};
                  const busy = !!rs.pending;
                  const errored = !!rs.error;
                  return (
                    <TableRow key={s.id} className={cn(busy && "opacity-90", errored && "bg-destructive/5")}>
                      <TableCell>
                        <div className="font-medium">{s.member}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.plan}</div>
                        <div className="text-xs text-muted-foreground">{s.cycle}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(s.amount)}</TableCell>
                      <TableCell className="text-sm">{s.method}</TableCell>
                      <TableCell className="tabular-nums text-sm">{s.renews}</TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5">
                          <Badge variant={statusVariant(s.status)} className="transition-all">
                            {s.status}
                          </Badge>
                          {busy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-0.5">
                          {errored && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => retryRow(s.id)}
                                >
                                  <AlertCircle className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Failed — click to retry</TooltipContent>
                            </Tooltip>
                          )}
                          {canPause && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={busy}
                                  onClick={() => commitStatus(s.id, "Paused", "paused")}
                                >
                                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Pause</TooltipContent>
                            </Tooltip>
                          )}
                          {canResume && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={busy}
                                  onClick={() => commitStatus(s.id, "Active", "resumed")}
                                >
                                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Resume</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInvoicesFor(s)}>
                                <Receipt className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Invoices</TooltipContent>
                          </Tooltip>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy}>
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setPlanChangeFor(s)}>
                                <ArrowRight className="h-3.5 w-3.5 mr-2" /> Change plan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setInvoicesFor(s)}>
                                <Receipt className="h-3.5 w-3.5 mr-2" /> View invoices
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {canPause && (
                                <DropdownMenuItem disabled={busy} onClick={() => commitStatus(s.id, "Paused", "paused")}>
                                  {busy ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Pause className="h-3.5 w-3.5 mr-2" />} Pause
                                </DropdownMenuItem>
                              )}
                              {canResume && (
                                <DropdownMenuItem disabled={busy} onClick={() => commitStatus(s.id, "Active", "resumed")}>
                                  {busy ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-2" />} Resume
                                </DropdownMenuItem>
                              )}
                              {errored && (
                                <DropdownMenuItem onClick={() => retryRow(s.id)}>
                                  <AlertCircle className="h-3.5 w-3.5 mr-2 text-destructive" /> Retry last action
                                </DropdownMenuItem>
                              )}
                              {canCancel && (
                                <DropdownMenuItem
                                  onClick={() => setCancelFor(s)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XIcon className="h-3.5 w-3.5 mr-2" /> Cancel
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>

                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Plan change modal */}
      <PlanChangeDialog
        sub={planChangeFor}
        activity={planChangeFor ? activity[planChangeFor.id] ?? [] : []}
        onOpenChange={(o) => !o && setPlanChangeFor(null)}
        onConfirm={(newPlanId, effective) => {
          const np = plans.find((p) => p.id === newPlanId);
          if (!planChangeFor || !np) return;
          const fromName = planChangeFor.plan;
          const subId = planChangeFor.id;
          setSubs((arr) =>
            arr.map((s) => (s.id === subId ? { ...s, planId: np.id, plan: np.name, amount: np.price, cycle: np.billingCycle as "Monthly" | "Annually" } : s)),
          );
          pushActivity(subId, { type: "plan", message: `Plan changed: ${fromName} → ${np.name} (effective ${effective})`, actor: "You" });
          toast.success(`Plan changed to ${np.name}`, { description: `Effective ${effective}` });
          setPlanChangeFor(null);
        }}
      />

      {/* Invoices drawer */}
      <InvoicesDrawer
        sub={invoicesFor}
        activity={invoicesFor ? activity[invoicesFor.id] ?? [] : []}
        onInvoiceDownloaded={(invId) => invoicesFor && pushActivity(invoicesFor.id, { type: "invoice", message: `Downloaded invoice ${invId}`, actor: "You" })}
        onOpenChange={(o) => !o && setInvoicesFor(null)}
      />


      {/* Cancel confirm */}
      <AlertDialog open={!!cancelFor} onOpenChange={(o) => !o && setCancelFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelFor && (
                <>This will cancel <span className="font-medium text-foreground">{cancelFor.member}</span>'s {cancelFor.plan} subscription. Access continues until {cancelFor.renews}.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancelFor) commitStatus(cancelFor.id, "Canceled", "canceled");
                setCancelFor(null);
              }}
            >
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

/* -------------------- Activity timeline -------------------- */

function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (!entries.length) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }
  const iconFor = (t: ActivityEntry["type"]) => {
    if (t === "plan") return ArrowRight;
    if (t === "invoice") return Receipt;
    if (t === "renewed") return RefreshIcon;
    if (t === "created") return Sparkles;
    return History;
  };
  return (
    <ol className="relative border-l ml-2 space-y-3">
      {entries.slice(0, 8).map((e) => {
        const Icon = iconFor(e.type);
        return (
          <li key={e.id} className="ml-4">
            <span className="absolute -left-[7px] mt-1 inline-flex h-3 w-3 items-center justify-center rounded-full border bg-background">
              <Icon className="h-2 w-2 text-muted-foreground" />
            </span>
            <div className="text-sm">{e.message}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {format(new Date(e.ts), "MMM d, yyyy · HH:mm")}{e.actor ? ` · ${e.actor}` : ""}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
// Reuse Loader2 as a subtle "renewed" icon stand-in to avoid an extra import.
const RefreshIcon = Loader2;

/* -------------------- Plan change dialog -------------------- */

function PlanChangeDialog({
  sub, activity, onOpenChange, onConfirm,
}: {
  sub: Sub | null;
  activity: ActivityEntry[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (newPlanId: string, effective: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string>("");
  const [effective, setEffective] = useState<"immediate" | "cycle_end">("cycle_end");
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    if (sub) {
      setStep(1);
      setSelected(plans.find((p) => p.id !== sub.planId)?.id ?? "");
      setEffective("cycle_end");
      setShowActivity(false);
    }
  }, [sub]);

  if (!sub) return null;
  const newPlan = plans.find((p) => p.id === selected);
  const effectiveDate =
    effective === "immediate" ? format(new Date(), "MMM d, yyyy") : format(new Date(sub.renews), "MMM d, yyyy");
  const prorated = newPlan ? Math.max(0, newPlan.price - sub.amount) : 0;

  return (
    <Dialog open={!!sub} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === 1 ? "Change plan" : "Confirm plan change"}</DialogTitle>
          <DialogDescription>
            {step === 1 ? `Choose a new plan for ${sub.member}.` : "Review the change before applying it."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
            {plans.map((p) => {
              const current = p.id === sub.planId;
              return (
                <Label
                  key={p.id}
                  htmlFor={`plan-${p.id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    selected === p.id ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                    current && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem id={`plan-${p.id}`} value={p.id} disabled={current} />
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {p.name}
                        {current && <Badge variant="outline" className="text-[10px]">Current</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.billingCycle}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium tabular-nums">{formatINR(p.price)}</div>
                </Label>
              );
            })}
          </RadioGroup>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-card/40">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">From</div>
                  <div className="font-medium">{sub.plan}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{formatINR(sub.amount)} / {sub.cycle.toLowerCase()}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">To</div>
                  <div className="font-medium">{newPlan?.name}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{newPlan && formatINR(newPlan.price)} / {newPlan?.billingCycle.toLowerCase()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Effective date</Label>
              <RadioGroup value={effective} onValueChange={(v) => setEffective(v as "immediate" | "cycle_end")} className="space-y-2">
                <Label htmlFor="eff-now" className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer", effective === "immediate" && "border-primary bg-primary/5")}>
                  <RadioGroupItem id="eff-now" value="immediate" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Immediately</div>
                    <div className="text-xs text-muted-foreground">Apply today · {format(new Date(), "MMM d, yyyy")}</div>
                  </div>
                  {prorated > 0 && <Badge variant="secondary" className="tabular-nums">+{formatINR(prorated)} prorated</Badge>}
                </Label>
                <Label htmlFor="eff-end" className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer", effective === "cycle_end" && "border-primary bg-primary/5")}>
                  <RadioGroupItem id="eff-end" value="cycle_end" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">End of current cycle</div>
                    <div className="text-xs text-muted-foreground">Starts {format(new Date(sub.renews), "MMM d, yyyy")}</div>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <Collapsible open={showActivity} onOpenChange={setShowActivity}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs w-full justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Recent activity ({activity.length})
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showActivity && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-lg border p-3 bg-card/40 max-h-48 overflow-y-auto">
                <ActivityTimeline entries={activity} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!selected || selected === sub.planId}>
                Continue <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => onConfirm(selected, effectiveDate)}>Confirm change</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Invoices drawer -------------------- */

function InvoicesDrawer({
  sub, activity, onInvoiceDownloaded, onOpenChange,
}: {
  sub: Sub | null;
  activity: ActivityEntry[];
  onInvoiceDownloaded: (invId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const invoices = useMemo(() => {
    if (!sub) return [];
    return Array.from({ length: 8 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      let status: InvStatus = "Paid";
      if (i === 0 && sub.status === "Past due") status = "Unpaid";
      else if (i === 4) status = "Refunded";
      else if (i === 6) status = "Void";
      return {
        id: `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${sub.id.slice(-4).toUpperCase()}`,
        date: d.toISOString().slice(0, 10),
        amount: sub.amount,
        status,
      };
    });
  }, [sub]);

  const [statusFilter, setStatusFilter] = useState<"all" | InvStatus>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (sub) { setStatusFilter("all"); setFrom(undefined); setTo(undefined); setQ(""); }
  }, [sub]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (needle && !inv.id.toLowerCase().includes(needle)) return false;
      const t = new Date(inv.date).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime() + 86_400_000 - 1) return false;
      return true;
    });
  }, [invoices, statusFilter, from, to, q]);

  const invStatusVariant = (s: InvStatus) =>
    s === "Paid" ? "secondary" : s === "Unpaid" ? "destructive" : "outline";

  const downloadAll = () => {
    if (!sub || filtered.length === 0) return;
    const header = `Invoice export\nMember: ${sub.member} <${sub.email}>\nPlan: ${sub.plan} (${sub.cycle})\nGenerated: ${new Date().toISOString()}\n${"-".repeat(48)}\n\n`;
    const body = filtered
      .map((inv) => `${inv.id}\nDate: ${inv.date}\nAmount: ${formatINR(inv.amount)}\nStatus: ${inv.status}\n`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${sub.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onInvoiceDownloaded(`(${filtered.length} invoices)`);
    toast.success(`Downloaded ${filtered.length} invoice${filtered.length === 1 ? "" : "s"}`);
  };

  const activeCount = (statusFilter !== "all" ? 1 : 0) + (from || to ? 1 : 0) + (q ? 1 : 0);

  return (
    <Sheet open={!!sub} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invoice history</SheetTitle>
          <SheetDescription>
            {sub && (
              <>
                <span className="font-medium text-foreground">{sub.member}</span> · {sub.plan} ·{" "}
                <Badge variant={sub ? statusVariant(sub.status) : "outline"} className="ml-1">{sub?.status}</Badge>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Filter bar */}
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | InvStatus)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Void">Void</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {from ? format(from, "MMM d") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={from} onSelect={setFrom} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {to ? format(to, "MMM d") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={to} onSelect={setTo} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setStatusFilter("all"); setFrom(undefined); setTo(undefined); setQ(""); }}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search invoice #…"
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" className="h-8" disabled={filtered.length === 0} onClick={downloadAll}>
              <FileDown className="h-3.5 w-3.5 mr-1.5" />
              Download all
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] tabular-nums">{filtered.length}</Badge>
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg bg-card/40">
              No invoices match your filters.
            </p>
          ) : (
            filtered.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-card/40">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{inv.id}</div>
                  <div className="text-xs text-muted-foreground">{inv.date}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm tabular-nums font-medium">{formatINR(inv.amount)}</span>
                  <Badge variant={invStatusVariant(inv.status)} className="text-[10px]">{inv.status}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => { if (sub) { downloadInvoice(sub, inv); onInvoiceDownloaded(inv.id); } }}
                    aria-label="Download invoice"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Activity timeline */}
        <div className="mt-6 pt-5 border-t">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Activity</h4>
            <span className="text-xs text-muted-foreground tabular-nums">({activity.length})</span>
          </div>
          <ActivityTimeline entries={activity} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

