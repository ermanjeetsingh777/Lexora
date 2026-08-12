import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLibrary, updateLibrary } from "@/lib/org.functions";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Trash2, Plus, RefreshCw, AlertCircle, Building2, Layers, TrendingUp,
  Share2, Clock, Users, MapPin, Eye, AlertTriangle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AreaTrend } from "@/components/charts";
import {
  libraries as mockLibraries,
  branches as mockBranches,
  occupancyTrend,
  generateSeats,
} from "@/lib/mock/data";
import { Progress } from "@/components/ui/progress";
import { SeatGrid, SeatLegend } from "@/components/seat-grid";
import { isUuid, getMockLibrary, updateMockLibrary } from "@/lib/institution-demo-service";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DaySlot = { closed: boolean; open: string | null; close: string | null };
type Exception = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  closed: boolean;
  open: string | null;
  close: string | null;
};

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

type TimeFmt = "24h" | "12h";

function fmtTime(t: string | null | undefined, fmt: TimeFmt): string {
  if (!t) return "—";
  if (fmt === "24h") return t;
  const [hStr, m = "00"] = t.split(":");
  let h = Number(hStr);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

function TimeFmtToggle({ value, onChange }: { value: TimeFmt; onChange: (v: TimeFmt) => void }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden" role="group" aria-label="Time format">
      {(["24h", "12h"] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          aria-pressed={value === f}
          className={`px-2 py-1 text-xs ${value === f ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
        >
          {f === "24h" ? "24h" : "AM/PM"}
        </button>
      ))}
    </div>
  );
}

function WeeklyHoursPreview({
  weekly,
  defaults,
  fmt,
  compact = false,
}: {
  weekly: Record<DayKey, DaySlot>;
  defaults?: Record<DayKey, DaySlot>;
  fmt: TimeFmt;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {DAYS.map((d) => {
        const v = weekly[d.key];
        const changed = defaults ? !slotEqual(v, defaults[d.key]) : false;
        return (
          <span
            key={d.key}
            title={v.closed ? `${d.label}: Closed` : `${d.label}: ${fmtTime(v.open, fmt)} – ${fmtTime(v.close, fmt)}`}
            className={`rounded-md border tabular-nums ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"} ${
              v.closed
                ? "bg-muted text-muted-foreground"
                : changed
                ? "bg-primary/10 border-primary/40"
                : "bg-primary/5 border-primary/20"
            }`}
          >
            <span className="font-medium mr-1">{d.short}</span>
            {v.closed ? "Closed" : `${fmtTime(v.open, fmt)}–${fmtTime(v.close, fmt)}`}
          </span>
        );
      })}
    </div>
  );
}

function branchDefaults(branch: any): Record<DayKey, DaySlot> {
  const bw = (branch?.weekly_hours ?? null) as Record<string, Partial<DaySlot>> | null;
  const bo = branch?.operating_start ?? null;
  const bc = branch?.operating_end ?? null;
  return Object.fromEntries(
    DAYS.map((d) => {
      const fromBranch = bw?.[d.key];
      const slot: DaySlot = fromBranch
        ? { closed: !!fromBranch.closed, open: fromBranch.open ?? null, close: fromBranch.close ?? null }
        : { closed: false, open: bo, close: bc };
      return [d.key, slot];
    }),
  ) as Record<DayKey, DaySlot>;
}

function slotEqual(a: DaySlot, b: DaySlot) {
  if (a.closed !== b.closed) return false;
  if (a.closed) return true;
  return (a.open ?? "") === (b.open ?? "") && (a.close ?? "") === (b.close ?? "");
}

function validateSlot(s: DaySlot): string | null {
  if (s.closed) return null;
  if (!s.open || !s.close) return "Set both opening and closing time";
  if (s.close <= s.open) return "Closing time must be after opening time";
  return null;
}

function validateException(e: Exception): string | null {
  if (!e.name.trim()) return "Name is required";
  if (!e.start_date || !e.end_date) return "Start and end dates are required";
  if (e.end_date < e.start_date) return "End date must be on or after start date";
  if (!e.closed) {
    if (!e.open || !e.close) return "Set both opening and closing time, or mark as closed";
    if (e.close <= e.open) return "Closing time must be after opening time";
  }
  return null;
}

export const Route = createFileRoute("/_authenticated/libraries/$libraryId")({
  head: ({ params }) => ({ meta: [{ title: `Library · ${params.libraryId.slice(0, 8)} — SmartLibrary` }] }),
  component: Page,
});

function Page() {
  const { libraryId } = useParams({ from: "/_authenticated/libraries/$libraryId" });
  const qc = useQueryClient();
  const fetchLib = useServerFn(getLibrary);
  const update = useServerFn(updateLibrary);
  const isMock = !isUuid(libraryId);

  const { data: lib, isLoading, error } = useQuery({
    queryKey: ["library", libraryId],
    queryFn: async () => {
      if (isMock) return getMockLibrary(libraryId);
      try {
        return await fetchLib({ data: { id: libraryId } });
      } catch (e) {
        // Fall back to mock if the id happens to match
        if (mockLibraries.find((l) => l.id === libraryId)) return getMockLibrary(libraryId);
        throw e;
      }
    },
    retry: false,
  });

  const [form, setForm] = useState<any>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [timeFmt, setTimeFmt] = useState<TimeFmt>(() => {
    if (typeof window === "undefined") return "24h";
    return (window.localStorage.getItem("lib-time-fmt") as TimeFmt) ?? "24h";
  });
  const setTimeFmtPersist = (v: TimeFmt) => {
    setTimeFmt(v);
    if (typeof window !== "undefined") window.localStorage.setItem("lib-time-fmt", v);
  };

  useEffect(() => {
    if (!lib) return;
    const defaults = branchDefaults((lib as any).branches);
    const existing = (lib as any).weekly_hours as Record<string, Partial<DaySlot>> | null;
    const weekly = Object.fromEntries(
      DAYS.map((d) => [d.key, { ...defaults[d.key], ...(existing?.[d.key] ?? {}) }]),
    ) as Record<DayKey, DaySlot>;
    setForm({
      ...lib,
      sections: Array.isArray((lib as any).sections) ? (lib as any).sections : [],
      weekly_hours: weekly,
      hours_exceptions: Array.isArray((lib as any).hours_exceptions) ? (lib as any).hours_exceptions : [],
    });
    setShowErrors(false);
  }, [lib]);

  const defaults = useMemo(() => branchDefaults((form ?? {}).branches), [form]);

  if (isLoading) return <LoadingShell />;
  if (error || !lib) return <ErrorShell message={error instanceof Error ? error.message : "Library not found"} />;
  if (!form) return <LoadingShell />;

  const save = async (patch: any) => {
    try {
      if (isMock) {
        updateMockLibrary(libraryId, patch);
      } else {
        await update({ data: { id: libraryId, patch } });
      }
      await qc.invalidateQueries({ queryKey: ["library", libraryId] });
      await qc.invalidateQueries({ queryKey: ["libraries"] });
      toast.success("Saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const capacity = Number(form.capacity ?? 0);
  const occupiedNum = Number(form._occupied ?? 0);
  const occupancy = capacity ? Math.round((occupiedNum / capacity) * 100) : 0;
  const available = Math.max(0, capacity - occupiedNum);

  const dayErrors: Record<DayKey, string | null> = Object.fromEntries(
    DAYS.map((d) => [d.key, validateSlot(form.weekly_hours[d.key])]),
  ) as Record<DayKey, string | null>;
  const exceptionErrors: (string | null)[] = (form.hours_exceptions as Exception[]).map(validateException);
  const weeklyHasErrors = DAYS.some((d) => dayErrors[d.key]);
  const exceptionsHaveErrors = exceptionErrors.some((e) => e !== null);

  const resyncFromBranch = () => {
    const changed = DAYS.filter((d) => !slotEqual(form.weekly_hours[d.key], defaults[d.key]));
    setForm({ ...form, weekly_hours: { ...defaults } });
    setShowErrors(false);
    if (changed.length === 0) toast.message("Already in sync with branch hours");
    else toast.success(`Re-synced ${changed.length} day${changed.length === 1 ? "" : "s"} from branch`);
  };

  const submitWeekly = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (weeklyHasErrors) { toast.error("Fix the highlighted errors before saving"); return; }
    save({ weekly_hours: form.weekly_hours });
  };

  const submitExceptions = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (exceptionsHaveErrors) { toast.error("Fix the highlighted errors before saving"); return; }
    save({ hours_exceptions: form.hours_exceptions });
  };

  const addException = () => {
    const today = new Date().toISOString().slice(0, 10);
    const next: Exception = {
      id: (globalThis.crypto?.randomUUID?.() ?? `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      name: "Holiday",
      start_date: today,
      end_date: today,
      closed: true,
      open: null,
      close: null,
    };
    setForm({ ...form, hours_exceptions: [...form.hours_exceptions, next] });
  };

  const updateException = (id: string, patch: Partial<Exception>) =>
    setForm({
      ...form,
      hours_exceptions: form.hours_exceptions.map((ex: Exception) => (ex.id === id ? { ...ex, ...patch } : ex)),
    });

  const removeException = (id: string) =>
    setForm({ ...form, hours_exceptions: form.hours_exceptions.filter((ex: Exception) => ex.id !== id) });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const opensToday = form.operating_start ?? form.branches?.operating_start ?? "—";
  const closesToday = form.operating_end ?? form.branches?.operating_end ?? "—";

  return (
    <>
      <PageHeader
        eyebrow={
          (
            <Link to="/libraries" className="inline-flex items-center label-mono hover:text-foreground">
              <ArrowLeft className="h-3 w-3 mr-1" />Libraries
            </Link>
          ) as any
        }
        title={form.name}
        description={
          (
            <div className="space-y-2">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{form.branches?.institutions?.name ?? ""}</span>
                <span className="opacity-50">·</span>
                <MapPin className="h-3.5 w-3.5" />
                <span>{form.branches?.name ?? ""}</span>
                <span className="opacity-50">·</span>
                <Layers className="h-3.5 w-3.5" />
                <span>Floor {form.floor}</span>
                <span className="opacity-50">·</span>
                <Clock className="h-3.5 w-3.5" />
                <span className="tabular-nums">{fmtTime(opensToday, timeFmt)}–{fmtTime(closesToday, timeFmt)}</span>
              </span>
              <WeeklyHoursPreview weekly={form.weekly_hours} defaults={defaults} fmt={timeFmt} compact />
            </div>
          ) as any
        }
        actions={
          <>
            <Badge variant={form.status === "Active" ? "default" : form.status === "Maintenance" ? "secondary" : "outline"}>
              {form.status}
            </Badge>
            <TimeFmtToggle value={timeFmt} onChange={setTimeFmtPersist} />
            <Button size="sm" variant="outline" onClick={resyncFromBranch} title="Copy Monday–Sunday hours from the parent branch">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Copy hours from branch
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!shareUrl) return;
              navigator.clipboard.writeText(shareUrl).then(() => toast.success("Link copied"));
            }}>
              <Share2 className="h-3.5 w-3.5 mr-1" />Share
            </Button>
            <Button size="sm" variant={form.status === "Active" ? "destructive" : "default"}
              onClick={() => save({ status: form.status === "Active" ? "Inactive" : "Active" })}>
              {form.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Capacity" value={capacity} hint={`${form._seatCount ?? capacity} seats`} />
        <MetricCard label="Occupied" value={occupiedNum} accent="primary" />
        <MetricCard label="Available" value={available} accent="success" />
        <MetricCard label="Occupancy" value={`${occupancy}%`} bar={occupancy} accent={occupancy >= 80 ? "warning" : "primary"} />
        <MetricCard label="Peak hour" value={peakHourLabel(timeFmt)} hint="Last 30 days" />
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="sticky top-0 z-10 bg-background/80 backdrop-blur">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seats">Seats</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="layout">Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel form={form} occupancy={occupancy} available={available} timeFmt={timeFmt} defaults={defaults} />
        </TabsContent>

        <TabsContent value="seats">
          <SeatsPanel form={form} />
        </TabsContent>

        <TabsContent value="profile">
          <GlassCard className="p-5">
            <SectionHeader title="Library profile" />
            <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); save({ name: form.name, floor: Number(form.floor), capacity: Number(form.capacity) }); }}>
              <div className="space-y-1.5 col-span-2"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Floor</Label><Input type="number" value={form.floor ?? 1} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity ?? 0} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
              <div className="col-span-2"><Button type="submit">Save profile</Button></div>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="hours">
          <GlassCard className="p-5">
            <SectionHeader
              title="Weekly hours"
              actions={
                <div className="flex items-center gap-2">
                  <TimeFmtToggle value={timeFmt} onChange={setTimeFmtPersist} />
                  <Button size="sm" variant="outline" onClick={resyncFromBranch} title="Copy Monday–Sunday hours from the parent branch">
                    <RefreshCw className="h-3 w-3 mr-1" />Copy from branch
                  </Button>
                </div>
              }
            />
            <div className="mb-4">
              <WeeklyHoursPreview weekly={form.weekly_hours} defaults={defaults} fmt={timeFmt} />
            </div>
            <p className="label-mono mb-3">
              Defaults come from the branch{(form as any).branches?.name ? ` (${(form as any).branches.name})` : ""}. Days that differ from branch defaults are highlighted.
            </p>
            <form className="space-y-2 max-w-2xl" onSubmit={submitWeekly}>
              {DAYS.map((d) => {
                const v: DaySlot = form.weekly_hours[d.key];
                const changed = !slotEqual(v, defaults[d.key]);
                const err = dayErrors[d.key];
                const upd = (patch: Partial<DaySlot>) =>
                  setForm({ ...form, weekly_hours: { ...form.weekly_hours, [d.key]: { ...v, ...patch } } });
                return (
                  <div
                    key={d.key}
                    className={`rounded-lg border p-3 transition-colors ${
                      err ? "border-destructive/60 bg-destructive/5"
                        : changed ? "border-primary/50 bg-primary/5" : ""
                    }`}
                  >
                    <div className="grid grid-cols-[140px_auto_1fr_1fr] items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.label}</span>
                        {changed && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Changed</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={!v.closed} onCheckedChange={(on) => upd({ closed: !on })} />
                        <span className="label-mono">{v.closed ? "Closed" : "Open"}</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="label-mono">Opens {timeFmt === "12h" && v.open ? `(${fmtTime(v.open, "12h")})` : ""}</Label>
                        <Input type="time" aria-invalid={!!err} disabled={v.closed} value={v.open ?? ""} onChange={(e) => upd({ open: e.target.value || null })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="label-mono">Closes {timeFmt === "12h" && v.close ? `(${fmtTime(v.close, "12h")})` : ""}</Label>
                        <Input type="time" aria-invalid={!!err} disabled={v.closed} value={v.close ?? ""} onChange={(e) => upd({ close: e.target.value || null })} />
                      </div>
                    </div>
                    {err && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive" role="alert">
                        <AlertCircle className="h-3 w-3" />{err}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="pt-2 flex items-center gap-3">
                <Button type="submit" disabled={weeklyHasErrors}>Save weekly hours</Button>
                {weeklyHasErrors && (
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Fix invalid time ranges above
                  </span>
                )}
              </div>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="exceptions">
          <GlassCard className="p-5">
            <SectionHeader
              title="Holiday & date exceptions"
              actions={
                <Button size="sm" variant="outline" onClick={addException}>
                  <Plus className="h-3 w-3 mr-1" />Add exception
                </Button>
              }
            />
            <p className="label-mono mb-3">
              Override the weekly schedule for a date range (e.g., public holidays, maintenance days).
            </p>
            <form className="space-y-3" onSubmit={submitExceptions}>
              {form.hours_exceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exceptions configured.</p>
              ) : (
                form.hours_exceptions.map((ex: Exception, idx: number) => {
                  const err = exceptionErrors[idx];
                  const showErr = showErrors && err;
                  return (
                    <div
                      key={ex.id}
                      className={`rounded-lg border p-3 ${showErr ? "border-destructive/60 bg-destructive/5" : ""}`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-end">
                        <div className="space-y-1">
                          <Label className="label-mono">Name</Label>
                          <Input value={ex.name} onChange={(e) => updateException(ex.id, { name: e.target.value })} placeholder="e.g. Diwali" />
                        </div>
                        <div className="space-y-1">
                          <Label className="label-mono">From</Label>
                          <Input type="date" value={ex.start_date} onChange={(e) => updateException(ex.id, { start_date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="label-mono">To</Label>
                          <Input type="date" value={ex.end_date} onChange={(e) => updateException(ex.id, { end_date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="label-mono">Closed</Label>
                          <div className="h-9 flex items-center">
                            <Switch checked={ex.closed} onCheckedChange={(on) => updateException(ex.id, { closed: on })} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="label-mono">Opens</Label>
                          <Input type="time" disabled={ex.closed} value={ex.open ?? ""} onChange={(e) => updateException(ex.id, { open: e.target.value || null })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="label-mono">Closes</Label>
                          <div className="flex gap-1">
                            <Input type="time" disabled={ex.closed} value={ex.close ?? ""} onChange={(e) => updateException(ex.id, { close: e.target.value || null })} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeException(ex.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {showErr && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />{err}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div className="pt-1"><Button type="submit">Save exceptions</Button></div>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="layout">
          <SectionsPanel form={form} setForm={setForm} onSave={() => save({ sections: form.sections })} />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ============================================================
// Sub-components
// ============================================================

function LoadingShell() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <GlassCard className="p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
      <h2 className="text-lg font-semibold mb-1">Couldn't load this library</h2>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button asChild variant="outline">
        <Link to="/libraries"><ArrowLeft className="h-4 w-4 mr-1" />Back to libraries</Link>
      </Button>
    </GlassCard>
  );
}

function MetricCard({
  label, value, hint, bar, accent = "primary",
}: { label: string; value: React.ReactNode; hint?: string; bar?: number; accent?: "primary" | "success" | "warning" }) {
  const accentClass =
    accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-primary";
  return (
    <GlassCard className="p-4">
      <p className="label-mono">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${accentClass}`}>{value}</p>
      {typeof bar === "number" && <Progress value={bar} className="h-1 mt-2" />}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </GlassCard>
  );
}

function peakHourLabel(fmt: TimeFmt = "24h"): string {
  // Derived from the deterministic occupancy heatmap shape: peak around 14:00–15:00
  return `${fmtTime("14:00", fmt)}–${fmtTime("15:00", fmt)}`;
}

function OccupancyGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 60;
  const c = Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="92" viewBox="0 0 160 92">
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
        <text x="80" y="70" textAnchor="middle" className="fill-foreground" style={{ fontSize: 24, fontWeight: 600 }}>
          {v}%
        </text>
      </svg>
      <p className="label-mono -mt-2">Occupancy</p>
    </div>
  );
}

function OverviewPanel({ form, occupancy, available, timeFmt, defaults }: { form: any; occupancy: number; available: number; timeFmt: TimeFmt; defaults: Record<DayKey, DaySlot> }) {
  const branchId: string | undefined = form?.branches?.id ?? form?.branch_id;
  const branchLibs = useMemo(
    () => (branchId ? mockLibraries.filter((l) => l.branchId === branchId) : []),
    [branchId],
  );
  const branch = useMemo(() => (branchId ? mockBranches.find((b) => b.id === branchId) : undefined), [branchId]);

  const [range, setRange] = useState<7 | 30 | 90>(30);
  const trend = useMemo(() => {
    const base = occupancyTrend(range);
    const cap = Math.max(1, Number(form?.capacity ?? form?._seatCount ?? 0));
    return base.map((d) => ({ date: d.date, occupancy: Math.round((d.occupancy / 100) * cap) }));
  }, [form?.capacity, form?._seatCount, range]);

  const byFloor = useMemo(() => {
    const map = new Map<number, { floor: number; capacity: number; occupied: number; libraries: number }>();
    for (const l of branchLibs) {
      const cur = map.get(l.floor) ?? { floor: l.floor, capacity: 0, occupied: 0, libraries: 0 };
      cur.capacity += l.capacity;
      cur.occupied += l.occupied;
      cur.libraries += 1;
      map.set(l.floor, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.floor - b.floor);
  }, [branchLibs]);

  const totals = byFloor.reduce(
    (acc, f) => ({ capacity: acc.capacity + f.capacity, occupied: acc.occupied + f.occupied, libraries: acc.libraries + f.libraries }),
    { capacity: 0, occupied: 0, libraries: 0 },
  );

  const occupied = Number(form._occupied ?? 0);
  const capacity = Number(form.capacity ?? 0);
  const occupiedPct = capacity ? (occupied / capacity) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5 md:col-span-1 flex flex-col items-center justify-center">
          <OccupancyGauge value={occupancy} />
          <div className="mt-3 w-full">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div className="bg-primary" style={{ width: `${occupiedPct}%` }} />
              <div className="bg-success/50" style={{ width: `${100 - occupiedPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" /> Occupied {occupied}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success/50" /> Available {available}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:col-span-2">
          <SectionHeader title="Today at a glance" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Open today" value={`${fmtTime(form.operating_start, timeFmt)}–${fmtTime(form.operating_end, timeFmt)}`} />
            <Stat label="Current shift" value={currentShift()} />
            <Stat label="On floor now" value={`${occupied} members`} />
            <Stat label="Status" value={form.status} />
          </div>
          <div className="mt-4">
            <p className="label-mono mb-1.5 flex items-center gap-1"><Clock className="h-3 w-3" /> This week</p>
            <WeeklyHoursPreview weekly={form.weekly_hours} defaults={defaults} fmt={timeFmt} />
          </div>
          <div className="mt-4 rounded-lg border p-3 bg-muted/20">
            <p className="label-mono mb-1">Last activity</p>
            <p className="text-sm">A-14 checked in · 2 min ago · B-22 reserved · 8 min ago</p>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <SectionHeader
          title="Occupancy trend"
          actions={
            <div className="flex items-center gap-2">
              <span className="label-mono flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Range</span>
              <div className="inline-flex rounded-md border overflow-hidden">
                {([7, 30, 90] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2 py-1 text-xs ${range === r ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>
          }
        />
        <AreaTrend
          data={trend}
          keys={[{ key: "occupancy", label: "Occupied seats", color: "hsl(var(--primary))" }]}
          height={220}
        />
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader
          title="Floor-by-floor breakdown"
          actions={branch ? <span className="label-mono flex items-center gap-1"><Building2 className="h-3 w-3" /> {branch.name}</span> : null}
        />
        {byFloor.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sibling libraries on this branch.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left label-mono">
                <tr>
                  <th className="px-3 py-2">Floor</th>
                  <th className="px-3 py-2 text-right">Libraries</th>
                  <th className="px-3 py-2 text-right">Capacity</th>
                  <th className="px-3 py-2 text-right">Occupied</th>
                  <th className="px-3 py-2 min-w-[180px]">Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byFloor.map((f) => {
                  const pct = f.capacity ? Math.min(100, Math.round((f.occupied / f.capacity) * 100)) : 0;
                  return (
                    <tr key={f.floor} className={f.floor === form.floor ? "bg-primary/5" : ""}>
                      <td className="px-3 py-2 font-medium flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />Floor {f.floor}
                        {f.floor === form.floor && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">this</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.libraries}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.capacity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.occupied}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5" />
                          <span className="tabular-nums text-xs w-9 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/20 text-sm font-medium">
                <tr>
                  <td className="px-3 py-2">Totals</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.libraries}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.capacity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.occupied}</td>
                  <td className="px-3 py-2 tabular-nums text-right">
                    {totals.capacity ? Math.round((totals.occupied / totals.capacity) * 100) : 0}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function currentShift(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
}

function SeatsPanel({ form }: { form: any }) {
  const seats = useMemo(
    () => generateSeats(Number(form.floor ?? 1), Math.min(120, Number(form.capacity ?? 60))),
    [form.floor, form.capacity],
  );
  return (
    <GlassCard className="p-5">
      <SectionHeader
        title="Seat layout"
        actions={
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" />Full preview</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader><SheetTitle>{form.name} — Seat preview</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3">
                <SeatLegend />
                <SeatGrid seats={seats} />
              </div>
            </SheetContent>
          </Sheet>
        }
      />
      <div className="mb-3"><SeatLegend /></div>
      <SeatGrid seats={seats} />
    </GlassCard>
  );
}

function SectionsPanel({ form, setForm, onSave }: { form: any; setForm: (v: any) => void; onSave: () => void }) {
  const totalAllocated = (form.sections as any[]).reduce((s, x) => s + Number(x.capacity || 0), 0);
  const capacity = Number(form.capacity ?? 0);
  const overflow = totalAllocated > capacity;
  const dots = ["bg-primary", "bg-success", "bg-warning", "bg-info", "bg-destructive"];
  return (
    <GlassCard className="p-5">
      <SectionHeader
        title="Sections"
        actions={
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, sections: [...form.sections, { name: `Section ${String.fromCharCode(65 + form.sections.length)}`, capacity: 10 }] })}>
            <Plus className="h-3 w-3 mr-1" />Add section
          </Button>
        }
      />
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="label-mono">Allocated <span className="tabular-nums text-foreground">{totalAllocated}</span> / {capacity}</span>
        {overflow && (
          <span className="flex items-center gap-1 text-destructive text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> Exceeds library capacity
          </span>
        )}
      </div>
      {form.sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sections configured. Sections let you group seats (e.g. silent zone, group study).</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {form.sections.map((s: any, idx: number) => {
            const pct = capacity ? Math.min(100, Math.round((Number(s.capacity || 0) / capacity) * 100)) : 0;
            return (
              <div key={idx} className="rounded-lg border p-3 bg-card/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${dots[idx % dots.length]}`} />
                  <Input className="h-8 flex-1" value={s.name} onChange={(e) => { const next = [...form.sections]; next[idx] = { ...s, name: e.target.value }; setForm({ ...form, sections: next }); }} />
                  <Input type="number" className="h-8 w-20" value={s.capacity} onChange={(e) => { const next = [...form.sections]; next[idx] = { ...s, capacity: Number(e.target.value) }; setForm({ ...form, sections: next }); }} />
                  <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, sections: form.sections.filter((_: any, i: number) => i !== idx) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="mt-1 label-mono flex justify-between"><span><Users className="h-3 w-3 inline mr-1" />{s.capacity} seats</span><span>{pct}%</span></p>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4"><Button onClick={onSave}>Save layout</Button></div>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="label-mono">{label}</p>
      <p className="font-semibold tabular-nums text-lg mt-1">{value}</p>
    </div>
  );
}
