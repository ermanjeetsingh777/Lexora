import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PersonActionsMenu } from "@/components/person-actions-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RenewPlanDialog, type RenewTarget } from "@/components/renew-plan-dialog";
import {
  ArrowLeft, Mail, Phone, IdCard, Building2, MapPin, Armchair, Clock,
  ChevronLeft, ChevronRight, ShieldAlert, User, CreditCard, Download,
  Calendar as CalendarIcon, TrendingUp, CheckCircle2, XCircle, AlertTriangle,
  BookOpen, Sparkles, Crown, Wallet, Timer, LogIn, LogOut, Pencil, RotateCcw,
} from "lucide-react";
import { getPerson } from "@/lib/people.functions";
import {
  DEMO_MEMBERS, getDemoMemberPayments,
  getDemoMemberActivity, getDemoMemberGuardian, getDemoMemberBooks,
  getDemoMemberInsights, memberLifecycle, renewMember,
  type AttendanceDay, type Lifecycle,
} from "@/lib/mock/members-demo";

import {
  useMemberAttendance, hoursBetween, todayKey,
  type AttendanceRecord, type DayStatus,
} from "@/lib/mock/attendance-log";
import { cn } from "@/lib/utils";


type Kind = "members" | "students" | "teachers";

const cfg: Record<Kind, { back: any; label: string }> = {
  members: { back: "/members", label: "All members" },
  students: { back: "/students", label: "All students" },
  teachers: { back: "/teachers", label: "All teachers" },
};

export function PersonProfile({ kind, id }: { kind: Kind; id: string }) {
  const meta = cfg[kind];
  const fetchPerson = useServerFn(getPerson);
  const isDemo = id.startsWith("demo_");
  const { data: p, isLoading, refetch } = useQuery({
    queryKey: [kind, id],
    queryFn: () => fetchPerson({ data: { kind, id } }).catch(() => null),
    retry: false,
    enabled: !isDemo,
  });

  const demoMember = kind === "members" && isDemo ? DEMO_MEMBERS.find(m => m.id === id) : null;
  const resolved: any = demoMember ?? p;

  if (!isDemo && isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!resolved) return <p className="text-muted-foreground">Not found.</p>;
  const m: any = resolved;
  const isDemoMember = kind === "members" && id.startsWith("demo_mem_");

  return (
    <>
      <PageHeader
        eyebrow={<Link to={meta.back} className="hover:text-foreground inline-flex items-center label-mono"><ArrowLeft className="h-3 w-3 mr-1" />{meta.label}</Link> as any}
        title={m.name}
        description={`${m.id.slice(0, 8)} · joined ${m.join_date ?? new Date(m.created_at).toISOString().slice(0,10)}`}
        actions={<PersonActionsMenu kind={kind} person={m} onChanged={() => refetch()} />}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16"><AvatarFallback>{m.name.split(" ").map((p: string) => p[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
            <div>
              <div className="font-semibold text-lg leading-tight">{m.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{kind.slice(0, -1)}</div>
              <div className="mt-1.5"><StatusBadge status={m.status ?? "Active"} /></div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <Row icon={<Mail className="h-4 w-4" />} label="Email" value={m.email ?? "—"} />
            <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={m.phone ?? "—"} />
            <Row icon={<IdCard className="h-4 w-4" />} label="ID" value={m.id} mono />
            <Row icon={<Building2 className="h-4 w-4" />} label="Branch" value={m.branch ?? m.branch_id?.slice(0, 8) ?? "—"} />
            {kind !== "teachers" && <Row icon={<MapPin className="h-4 w-4" />} label="Library" value={m.library ?? m.library_id?.slice(0, 8) ?? "—"} />}
            {kind !== "teachers" && <Row icon={<Armchair className="h-4 w-4" />} label="Seat" value={m.seat ?? m.seat_id?.slice(0, 8) ?? "Unassigned"} />}
            {kind !== "teachers" && <Row icon={<Clock className="h-4 w-4" />} label="Shift" value={m.shift ?? "—"} />}
            {kind === "members" && <Row icon={<CalendarIcon className="h-4 w-4" />} label="Plan expires" value={`${memberLifecycle(m).expiry} · ${memberLifecycle(m).state}`} />}

            {kind === "students" && <>
              <Row icon={<IdCard className="h-4 w-4" />} label="Roll number" value={m.roll_no ?? "—"} />
              <Row icon={<IdCard className="h-4 w-4" />} label="Class / Grade" value={m.class_grade ?? "—"} />
              <Row icon={<Phone className="h-4 w-4" />} label="Guardian" value={`${m.guardian_name ?? "—"} ${m.guardian_phone ? "· " + m.guardian_phone : ""}`} />
            </>}
            {kind === "teachers" && <Row icon={<IdCard className="h-4 w-4" />} label="Subject" value={m.subject ?? "—"} />}
          </div>
        </GlassCard>

        <div className="lg:col-span-2 space-y-4">
          {isDemoMember ? (
            <DemoMemberTabs id={id} member={m} />
          ) : (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {kind !== "teachers" && <TabsTrigger value="subscription">Subscription</TabsTrigger>}
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                {kind !== "teachers" && <TabsTrigger value="payments">Payments</TabsTrigger>}
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview"><GlassCard className="p-5"><SectionHeader title="Activity timeline" /><p className="text-sm text-muted-foreground">Recent events for this person will appear here once attendance and payments are wired up.</p></GlassCard></TabsContent>
              <TabsContent value="subscription"><GlassCard className="p-5"><SectionHeader title="Current subscription" /><p className="text-sm text-muted-foreground">Plan: {m.plan_id ? m.plan_id.slice(0, 8) : "—"}</p></GlassCard></TabsContent>
              <TabsContent value="attendance"><GlassCard className="p-5"><SectionHeader title="Attendance log" /><p className="text-sm text-muted-foreground">Hook up to attendance scans to populate.</p></GlassCard></TabsContent>
              <TabsContent value="payments"><GlassCard className="p-5"><SectionHeader title="Payment history" /><p className="text-sm text-muted-foreground">Outstanding: ₹{Number(m.fees_owed ?? 0).toLocaleString()}</p></GlassCard></TabsContent>
              <TabsContent value="history"><GlassCard className="p-5"><SectionHeader title="Audit history" /><p className="text-sm text-muted-foreground">Branch/seat/shift/plan changes recorded against this profile.</p></GlassCard></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}

function DemoMemberTabs({ id, member }: { id: string; member: any }) {
  const att = useMemberAttendance(id, 90);
  const attendance = att.records;
  const [editDate, setEditDate] = useState<string | null>(null);
  const payments = useMemo(() => getDemoMemberPayments(id), [id]);
  const activity = useMemo(() => getDemoMemberActivity(id), [id]);
  const guardian = useMemo(() => getDemoMemberGuardian(id), [id]);
  const books = useMemo(() => getDemoMemberBooks(id), [id]);
  const insights = useMemo(() => getDemoMemberInsights(id), [id]);
  const [renewTick, setRenewTick] = useState(0);
  const life = useMemo(() => memberLifecycle(member), [member, renewTick]);

  const editing = editDate ? attendance.find(a => a.date === editDate) ?? null : null;

  const present = attendance.filter(a => a.status === "present").length;
  const late = attendance.filter(a => a.status === "late").length;
  const workDays = attendance.filter(a => a.status !== "holiday").length;
  const attRate = workDays ? Math.round(((present + late) / workDays) * 100) : 0;

  const [renewTarget, setRenewTarget] = useState<RenewTarget | null>(null);
  const onRenew = () =>
    setRenewTarget({
      id,
      name: member.name ?? "Member",
      membership: member.membership ?? "Basic",
      expiry: life.expiry,
      daysLeft: life.daysLeft,
      feesOwed: Number(member.fees_owed ?? 0),
    });
  const confirmRenew = (t: RenewTarget) => {
    const next = renewMember(t.id, t.membership);
    setRenewTarget(null);
    setRenewTick(v => v + 1);
    toast.success("Membership renewed", { description: `${t.membership} plan valid until ${next}` });
  };

  const heroStats = [
    { label: "Plan expires", value: life.relative, icon: <CalendarIcon className={cn("h-4 w-4", life.daysLeft < 0 ? "text-destructive" : life.daysLeft <= 7 ? "text-amber-500" : "text-blue-500")} />, hint: `${life.state} · ${life.expiry}` },
    { label: "Attendance", value: `${attRate}%`, icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, hint: `${present + late}/${workDays} days` },
    { label: "Visits · 30d", value: String(member.visits_30d ?? 0), icon: <CalendarIcon className="h-4 w-4 text-blue-500" />, hint: `Last ${member.last_visit ?? "—"}` },
    { label: "Books", value: String(books.length), icon: <BookOpen className="h-4 w-4 text-violet-500" />, hint: `${books.filter(b => b.status !== "Returned").length} active` },
    { label: "Fees due", value: member.fees_owed > 0 ? `₹${member.fees_owed.toLocaleString()}` : "Clear", icon: <Wallet className={cn("h-4 w-4", member.fees_owed > 0 ? "text-rose-500" : "text-muted-foreground")} />, hint: member.fees_owed > 0 ? "Action needed" : "All paid" },
    { label: "Member for", value: `${insights.daysAsMember}d`, icon: <Timer className="h-4 w-4 text-amber-500" />, hint: `Since ${member.join_date}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {heroStats.map(s => (
          <div key={s.label} className="border rounded-lg p-3 bg-gradient-to-br from-muted/30 to-background">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{s.icon}{s.label}</div>
            <div className="text-lg font-semibold tabular-nums mt-1">{s.value}</div>
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">{s.hint}</div>
          </div>
        ))}
      </div>

      {life.action && <MembershipBanner life={life} onRenew={onRenew} />}

      <RenewPlanDialog
        target={renewTarget}
        onOpenChange={(o) => { if (!o) setRenewTarget(null); }}
        onConfirm={confirmRenew}
      />

      <CheckInOutCard att={att} onEditToday={() => setEditDate(todayKey())} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <InsightsCard insights={insights} plan={member.membership} renewal={life.expiry} />

          <GuardianCard g={guardian} />
          <GlassCard className="p-5">
            <SectionHeader title="Activity timeline" description="Latest events across payments, attendance, plan and seat changes" />
            <TimelineList events={activity} />
          </GlassCard>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceKpis attendance={attendance} />
          <GlassCard className="p-5">
            <MonthCalendar attendance={attendance} onPick={(d) => setEditDate(d)} />
          </GlassCard>
          <AttendanceLogTable records={attendance} onEdit={(d) => setEditDate(d)} />
          <GlassCard className="p-5">
            <SectionHeader title="90-day heatmap" description="Hours per day — darker = more time on premises" />
            <HeatmapGrid attendance={attendance} />
          </GlassCard>
        </TabsContent>


        <TabsContent value="books" className="space-y-4">
          <BooksSection books={books} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentsSummary payments={payments} feesOwed={member.fees_owed ?? 0} />
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b label-mono bg-muted/30">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Invoice</th>
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Amount</th>
                    <th className="px-4 py-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5 tabular-nums">{p.date}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{p.invoice}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.method}</td>
                      <td className="px-4 py-2.5"><PayStatus s={p.status} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">₹{p.amount.toLocaleString()}</td>
                      <td className="px-4 py-2.5"><Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="contacts">
          <GuardianCard g={guardian} full />
        </TabsContent>
      </Tabs>

      <EditDayDialog
        open={!!editDate}
        record={editing}
        date={editDate}
        onClose={() => setEditDate(null)}
        onSave={(rec) => { att.saveDay(rec); setEditDate(null); toast.success(`Attendance saved for ${rec.date}`); }}
        onReset={(d) => { att.resetDay(d); setEditDate(null); toast.message("Reverted to original record"); }}
      />
    </div>
  );
}

function CheckInOutCard({ att, onEditToday }: { att: ReturnType<typeof useMemberAttendance>; onEditToday: () => void }) {
  const t = att.today;
  const checkedIn = !!t.checkIn && !t.checkOut;
  const done = !!t.checkIn && !!t.checkOut;
  const live = t.checkIn && !t.checkOut ? "In library now" : done ? `${t.hours}h on premises` : "Not checked in yet";

  return (
    <GlassCard className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="label-mono text-[10px]">Today · {t.date}</div>
          <div className="flex items-center gap-2 mt-1">
            <DayStatusPill status={t.status} />
            <span className="text-sm text-muted-foreground truncate">{live}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><LogIn className="h-3.5 w-3.5 text-emerald-500" /> In: <span className="font-mono text-foreground">{t.checkIn ?? "—"}</span></span>
            <span className="inline-flex items-center gap-1"><LogOut className="h-3.5 w-3.5 text-rose-500" /> Out: <span className="font-mono text-foreground">{t.checkOut ?? "—"}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={checkedIn} onClick={() => { const time = att.checkIn(); toast.success(`Checked in at ${time}`); }}>
            <LogIn className="h-4 w-4 mr-1" /> Check in
          </Button>
          <Button size="sm" variant="outline" disabled={!t.checkIn || done} onClick={() => { const time = att.checkOut(); toast.success(`Checked out at ${time}`); }}>
            <LogOut className="h-4 w-4 mr-1" /> Check out
          </Button>
          <Button size="sm" variant="ghost" onClick={onEditToday}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

const STATUS_PILL: Record<DayStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  late: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  absent: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  holiday: "bg-slate-500/15 text-slate-500 border-slate-500/30",
};

function DayStatusPill({ status }: { status: DayStatus }) {
  return <span className={cn("inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize", STATUS_PILL[status])}>{status}</span>;
}

function AttendanceLogTable({ records, onEdit }: { records: AttendanceRecord[]; onEdit: (date: string) => void }) {
  const rows = [...records].reverse().slice(0, 30);
  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="px-4 pt-4"><SectionHeader title="Check-in log" description="Last 30 days — edit any entry to correct times or status" /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b label-mono bg-muted/30">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Check in</th>
              <th className="px-4 py-2 font-medium">Check out</th>
              <th className="px-4 py-2 font-medium text-right">Hours</th>
              <th className="px-4 py-2 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => (
              <tr key={r.date} className="hover:bg-muted/40">
                <td className="px-4 py-2 tabular-nums">{r.date}</td>
                <td className="px-4 py-2"><DayStatusPill status={r.status} /></td>
                <td className="px-4 py-2 font-mono text-xs">{r.checkIn ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.checkOut ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.hours ? `${r.hours}h` : "—"}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(r.date)} aria-label={`Edit ${r.date}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function EditDayDialog({
  open, record, date, onClose, onSave, onReset,
}: {
  open: boolean;
  record: AttendanceRecord | null;
  date: string | null;
  onClose: () => void;
  onSave: (rec: AttendanceRecord) => void;
  onReset: (date: string) => void;
}) {
  const [status, setStatus] = useState<DayStatus>("present");
  const [inT, setInT] = useState("");
  const [outT, setOutT] = useState("");

  useEffect(() => {
    if (!open) return;
    setStatus(record?.status ?? "present");
    setInT(record?.checkIn ?? "");
    setOutT(record?.checkOut ?? "");
  }, [open, record?.date, record?.status, record?.checkIn, record?.checkOut]);

  const needsTimes = status === "present" || status === "late";
  const hours = hoursBetween(inT, outT);
  const error =
    needsTimes && inT && outT && hours <= 0
      ? "Check-out must be later than check-in."
      : needsTimes && !inT && outT
        ? "Add a check-in time first."
        : null;

  const save = () => {
    if (!date || error) return;
    onSave({
      date,
      status,
      hours: needsTimes ? hours : 0,
      checkIn: needsTimes && inT ? inT : null,
      checkOut: needsTimes && outT ? outT : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit attendance · {date}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Status</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["present", "late", "absent", "holiday"] as DayStatus[]).map(s => (
                <Button key={s} type="button" size="sm" variant={status === s ? "default" : "outline"} className="capitalize" onClick={() => setStatus(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
          {needsTimes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="att-in" className="mb-1.5 block">Check in</Label>
                <Input id="att-in" type="time" value={inT} onChange={(e) => setInT(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="att-out" className="mb-1.5 block">Check out</Label>
                <Input id="att-out" type="time" value={outT} onChange={(e) => setOutT(e.target.value)} />
              </div>
            </div>
          )}
          {needsTimes && <div className="text-xs text-muted-foreground">Duration: <span className="font-mono text-foreground">{hours}h</span></div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => date && onReset(date)}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="button" size="sm" disabled={!!error} onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function MembershipBanner({ life, onRenew }: { life: Lifecycle; onRenew: () => void }) {
  const tone =
    life.tone === "destructive" ? "border-destructive/30 bg-destructive/10 text-destructive"
      : life.tone === "warning" ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-info/30 bg-info/10 text-info";
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3", tone)}>
      <AlertTriangle className="h-4 w-4" />
      <div className="text-sm">
        <span className="font-medium">{life.state}</span>
        <span className="opacity-80"> — plan expires {life.expiry} ({life.relative}). {life.action}.</span>
      </div>
      {life.state !== "New" && (
        <Button size="sm" variant="outline" className="ml-auto" onClick={onRenew}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Renew plan
        </Button>
      )}
    </div>
  );
}

function InsightsCard({ insights, plan, renewal }: { insights: ReturnType<typeof getDemoMemberInsights>; plan: string; renewal?: string }) {
  const items = [
    { label: "Current plan", value: plan, icon: <Crown className="h-4 w-4 text-amber-500" /> },
    { label: "Monthly fee", value: `₹${insights.monthlyFee.toLocaleString()}`, icon: <CreditCard className="h-4 w-4 text-primary" /> },
    { label: "Lifetime spend", value: `₹${insights.lifetimeSpend.toLocaleString()}`, icon: <Wallet className="h-4 w-4 text-emerald-500" /> },
    { label: "Next renewal", value: renewal ?? insights.nextRenewal, icon: <CalendarIcon className="h-4 w-4 text-blue-500" /> },

    { label: "Favorite shift", value: insights.favoriteShift, icon: <Clock className="h-4 w-4 text-violet-500" /> },
    { label: "Top category", value: insights.favoriteCategory, icon: <BookOpen className="h-4 w-4 text-rose-500" /> },
    { label: "Punctuality", value: `${insights.punctualityScore}/100`, icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
  ];
  return (
    <GlassCard className="p-5">
      <SectionHeader
        title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Member insights</span> as any}
        description="Auto-computed from activity and billing"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map(i => (
          <div key={i.label} className="border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{i.icon}{i.label}</div>
            <div className="text-sm font-semibold mt-1 truncate">{i.value}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function BooksSection({ books }: { books: ReturnType<typeof getDemoMemberBooks> }) {
  const active = books.filter(b => b.status === "Active").length;
  const overdue = books.filter(b => b.status === "Overdue").length;
  const returned = books.filter(b => b.status === "Returned").length;
  const stats = [
    { label: "Active", value: active, tone: "text-blue-500" },
    { label: "Overdue", value: overdue, tone: "text-rose-500" },
    { label: "Returned", value: returned, tone: "text-emerald-500" },
    { label: "Total", value: books.length, tone: "text-foreground" },
  ];
  const bookStatus: Record<string, string> = {
    Active: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    Overdue: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    Returned: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  };
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="border rounded-lg p-3 bg-muted/20">
            <div className="label-mono text-[10px]">{s.label}</div>
            <div className={cn("text-lg font-semibold tabular-nums mt-1", s.tone)}>{s.value}</div>
          </div>
        ))}
      </div>
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b label-mono bg-muted/30">
                <th className="px-4 py-2 font-medium">Book</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Borrowed</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {books.map(b => (
                <tr key={b.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{b.title}</div>
                    <div className="text-xs text-muted-foreground">{b.author}</div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{b.category}</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">{b.borrowed}</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">{b.due}</td>
                  <td className="px-4 py-2.5"><span className={cn("inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium", bookStatus[b.status])}>{b.status}</span></td>
                </tr>
              ))}
              {books.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">No borrow history</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </>
  );
}

function AttendanceKpis({ attendance }: { attendance: AttendanceDay[] }) {
  const present = attendance.filter(a => a.status === "present").length;
  const late = attendance.filter(a => a.status === "late").length;
  const absent = attendance.filter(a => a.status === "absent").length;
  const workDays = attendance.filter(a => a.status !== "holiday").length;
  const rate = workDays ? Math.round(((present + late) / workDays) * 100) : 0;
  let streak = 0, best = 0;
  for (const a of attendance) {
    if (a.status === "present" || a.status === "late") { streak++; best = Math.max(best, streak); }
    else if (a.status === "absent") streak = 0;
  }
  const stats = [
    { label: "Present", value: present, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
    { label: "Late", value: late, icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
    { label: "Absent", value: absent, icon: <XCircle className="h-4 w-4 text-rose-500" /> },
    { label: "Attendance", value: `${rate}%`, icon: <TrendingUp className="h-4 w-4 text-primary" /> },
    { label: "Best streak", value: `${best}d`, icon: <CalendarIcon className="h-4 w-4 text-violet-500" /> },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {stats.map(s => (
        <div key={s.label} className="border rounded-lg p-3 bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{s.icon}{s.label}</div>
          <div className="text-lg font-semibold tabular-nums mt-1">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MonthCalendar({ attendance, onPick }: { attendance: AttendanceDay[]; onPick?: (date: string) => void }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const map = useMemo(() => new Map(attendance.map(a => [a.date, a])), [attendance]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleString("en", { month: "long", year: "numeric" });
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null; a?: AttendanceDay }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, a: map.get(localKey(date)) });
  }

  while (cells.length % 7 !== 0) cells.push({ date: null });

  const statusColor = (s?: AttendanceDay["status"]) => {
    if (s === "present") return "bg-emerald-500/70 text-white";
    if (s === "late") return "bg-amber-500/70 text-white";
    if (s === "absent") return "bg-rose-500/60 text-white";
    if (s === "holiday") return "bg-slate-400/30 text-muted-foreground";
    return "bg-muted/40 text-muted-foreground";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <SectionHeader title={monthName} description="Attendance calendar" />
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 label-mono mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={!c.date}
            onClick={() => c.date && onPick?.(localKey(c.date))}
            title={c.a ? `${c.date!.toDateString()} — ${c.a.status}${c.a.hours ? ` · ${c.a.hours}h` : ""}` : c.date?.toDateString()}
            className={cn("aspect-square rounded-md text-xs flex flex-col items-center justify-center p-1 transition",
              !c.date && "opacity-0 pointer-events-none",
              c.date && statusColor(c.a?.status),
              c.date && "hover:ring-2 hover:ring-primary/40 cursor-pointer")}
          >
            <span className="font-mono">{c.date?.getDate()}</span>
            {c.a?.hours ? <span className="text-[9px] opacity-80 tabular-nums">{c.a.hours}h</span> : null}
          </button>
        ))}

      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Legend color="bg-emerald-500/70" label="Present" />
        <Legend color="bg-amber-500/70" label="Late" />
        <Legend color="bg-rose-500/60" label="Absent" />
        <Legend color="bg-slate-400/30" label="Holiday" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded-sm", color)} />{label}</span>;
}

function HeatmapGrid({ attendance }: { attendance: AttendanceDay[] }) {
  // Group into columns of 7 (weeks). Start from oldest day on top.
  const cols: AttendanceDay[][] = [];
  let current: AttendanceDay[] = [];
  const first = new Date(attendance[0].date);
  const pad = first.getDay();
  for (let i = 0; i < pad; i++) current.push({ date: "", status: "holiday", hours: -1 } as any);
  for (const a of attendance) {
    current.push(a);
    if (current.length === 7) { cols.push(current); current = []; }
  }
  if (current.length) { while (current.length < 7) current.push({ date: "", status: "holiday", hours: -1 } as any); cols.push(current); }

  const intensity = (h: number) => {
    if (h <= 0) return "bg-muted/40";
    if (h < 3) return "bg-emerald-500/20";
    if (h < 5) return "bg-emerald-500/40";
    if (h < 7) return "bg-emerald-500/70";
    return "bg-emerald-600";
  };

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((d, di) => (
              <div key={di}
                title={d.date ? `${d.date} · ${d.status}${d.hours > 0 ? ` · ${d.hours}h` : ""}` : ""}
                className={cn("h-3.5 w-3.5 rounded-sm", d.hours === -1 ? "bg-transparent" : d.status === "absent" ? "bg-rose-500/40" : intensity(d.hours))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        {["bg-muted/40","bg-emerald-500/20","bg-emerald-500/40","bg-emerald-500/70","bg-emerald-600"].map(c => (
          <span key={c} className={cn("h-3 w-3 rounded-sm", c)} />
        ))}
        <span>More</span>
        <span className="ml-4 inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-rose-500/40" /> Absent</span>
      </div>
    </div>
  );
}

function PaymentsSummary({ payments, feesOwed }: { payments: ReturnType<typeof getDemoMemberPayments>; feesOwed: number }) {
  const paid = payments.filter(p => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === "Pending").reduce((s, p) => s + p.amount, 0);
  const last = payments.find(p => p.status === "Paid");
  const items = [
    { label: "Total paid", value: `₹${paid.toLocaleString()}`, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
    { label: "Pending", value: `₹${pending.toLocaleString()}`, icon: <Clock className="h-4 w-4 text-amber-500" /> },
    { label: "Outstanding", value: `₹${Number(feesOwed).toLocaleString()}`, icon: <AlertTriangle className={cn("h-4 w-4", feesOwed > 0 ? "text-rose-500" : "text-muted-foreground")} /> },
    { label: "Last payment", value: last?.date ?? "—", icon: <CreditCard className="h-4 w-4 text-primary" /> },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map(i => (
        <div key={i.label} className="border rounded-lg p-3 bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{i.icon}{i.label}</div>
          <div className="text-base font-semibold tabular-nums mt-1">{i.value}</div>
        </div>
      ))}
    </div>
  );
}

function PayStatus({ s }: { s: string }) {
  const map: Record<string, string> = {
    Paid: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    Pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    Failed: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    Refunded: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  };
  return <span className={cn("inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium", map[s])}>{s}</span>;
}

function TimelineList({ events }: { events: ReturnType<typeof getDemoMemberActivity> }) {
  const dot: Record<string, string> = {
    payment: "bg-emerald-500", attendance: "bg-blue-500", plan: "bg-violet-500", seat: "bg-amber-500", note: "bg-slate-500",
  };
  return (
    <ol className="relative border-l ml-2 space-y-4">
      {events.map(e => (
        <li key={e.id} className="ml-4">
          <span className={cn("absolute -left-1.5 h-3 w-3 rounded-full ring-2 ring-background", dot[e.type])} />
          <div className="text-sm font-medium">{e.title}</div>
          {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
          <div className="text-[10px] label-mono mt-0.5">{new Date(e.ts).toLocaleString()}</div>
        </li>
      ))}
    </ol>
  );
}

function GuardianCard({ g, full }: { g: ReturnType<typeof getDemoMemberGuardian>; full?: boolean }) {
  return (
    <GlassCard className="p-5">
      <SectionHeader title="Guardian & emergency contact" description="Reach out in case of any incident" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-primary" />
            <div className="font-medium text-sm">Guardian</div>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border bg-background">{g.relation}</span>
          </div>
          <div className="text-base font-semibold">{g.name}</div>
          <div className="mt-2 space-y-1.5 text-sm">
            <a href={`tel:${g.phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="h-3.5 w-3.5" />{g.phone}</a>
            <a href={`mailto:${g.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="h-3.5 w-3.5" />{g.email}</a>
            {full && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />{g.address}</div>}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-rose-500/5 border-rose-500/30">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <div className="font-medium text-sm">Emergency contact</div>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border bg-background">{g.emergency.relation}</span>
          </div>
          <div className="text-base font-semibold">{g.emergency.name}</div>
          <div className="mt-2">
            <a href={`tel:${g.emergency.phone}`} className="flex items-center gap-2 text-sm hover:text-rose-500"><Phone className="h-3.5 w-3.5" />{g.emergency.phone}</a>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="label-mono">{label}</div>
        <div className={(mono ? "font-mono text-xs " : "text-sm ") + "truncate"}>{value}</div>
      </div>
    </div>
  );
}
