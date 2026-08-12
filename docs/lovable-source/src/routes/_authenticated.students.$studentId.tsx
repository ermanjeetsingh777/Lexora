import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonActionsMenu } from "@/components/person-actions-menu";
import { AreaTrend } from "@/components/charts";
import { ArrowLeft, Mail, Phone, IdCard, Armchair, Clock, Building2, MapPin, GraduationCap, CalendarDays, CreditCard, TrendingUp } from "lucide-react";
import { getPerson } from "@/lib/people.functions";
import { getDemoStudent, studentAttendance14d, studentPayments, studentActivity, DEMO_STUDENTS } from "@/lib/mock/students-demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  head: () => ({ meta: [{ title: "Student — SmartLibrary" }] }),
  component: StudentDetail,
});

function StudentDetail() {
  const { studentId } = useParams({ from: "/_authenticated/students/$studentId" });
  const fetchPerson = useServerFn(getPerson);
  const isDemo = studentId.startsWith("demo_stu_");
  const { data: p, isLoading, refetch } = useQuery({
    queryKey: ["students", studentId],
    queryFn: () => fetchPerson({ data: { kind: "students", id: studentId } }).catch(() => null),
    retry: false,
    enabled: !isDemo,
  });

  const s = useMemo(() => {
    if (isDemo) return getDemoStudent(studentId);
    const m: any = p;
    if (!m) return null;
    const fallback = DEMO_STUDENTS[0];
    return {
      ...fallback,
      id: m.id,
      name: m.name,
      email: m.email ?? fallback.email,
      phone: m.phone ?? fallback.phone,
      status: (m.status ?? "Active") as any,
      shift: (m.shift ?? "Morning") as any,
      roll_no: m.roll_no ?? fallback.roll_no,
      class_grade: m.class_grade ?? fallback.class_grade,
      guardian_name: m.guardian_name ?? fallback.guardian_name,
      guardian_phone: m.guardian_phone ?? fallback.guardian_phone,
      seat: m.seat_id?.slice(0, 6) ?? fallback.seat,
      fees_owed: Number(m.fees_owed ?? 0),
      join_date: m.join_date ?? new Date(m.created_at ?? Date.now()).toISOString().slice(0, 10),
    };
  }, [isDemo, studentId, p]);

  if (!isDemo && isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!s) return <p className="text-muted-foreground">Not found.</p>;

  const seed = s.id.length + (s.roll_no?.length ?? 0);
  const attendance = studentAttendance14d(seed);
  const payments = studentPayments(seed);
  const activity = studentActivity(seed);
  const totalHours = attendance.reduce((sum, d) => sum + d.hours, 0).toFixed(1);
  const paidCount = payments.filter(p => p.status === "Paid").length;

  return (
    <>
      <PageHeader
        eyebrow={
          (<Link to="/students" className="hover:text-foreground inline-flex items-center label-mono">
            <ArrowLeft className="h-3 w-3 mr-1" />All students
          </Link>) as any
        }
        title={s.name}
        description={`${s.roll_no} · ${s.class_grade} · joined ${s.join_date}`}
        actions={!isDemo ? <PersonActionsMenu kind="students" person={s as any} onChanged={() => refetch()} /> : undefined}
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Attendance rate" value={`${s.attendance_rate}%`} delta={1.8} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Hours (14d)" value={totalHours} hint="Total time in library" icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Paid months" value={`${paidCount}/${payments.length}`} icon={<CreditCard className="h-4 w-4" />} />
        <KpiCard label="Fees owed" value={s.fees_owed > 0 ? `₹${s.fees_owed.toLocaleString()}` : "—"} hint={s.fees_owed > 0 ? "Overdue" : "All clear"} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback style={{ background: `oklch(0.85 0.08 ${s.avatar_hue})` }} className="text-foreground">
                {s.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-lg leading-tight">{s.name}</div>
              <div className="text-xs text-muted-foreground">Student</div>
              <div className="mt-1.5"><StatusBadge status={s.status} /></div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <Row icon={<Mail className="h-4 w-4" />} label="Email" value={s.email} />
            <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={s.phone} />
            <Row icon={<IdCard className="h-4 w-4" />} label="Roll number" value={s.roll_no} mono />
            <Row icon={<GraduationCap className="h-4 w-4" />} label="Class / Grade" value={s.class_grade} />
            <Row icon={<Clock className="h-4 w-4" />} label="Shift" value={s.shift} />
            <Row icon={<Armchair className="h-4 w-4" />} label="Seat" value={s.seat} mono />
            <Row icon={<Building2 className="h-4 w-4" />} label="Branch" value={s.branch} />
            <Row icon={<MapPin className="h-4 w-4" />} label="Library" value={s.library} />
            <Row icon={<CreditCard className="h-4 w-4" />} label="Plan" value={s.plan} />
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="label-mono">Guardian</div>
              <div className="text-sm">{s.guardian_name}</div>
              <div className="text-xs text-muted-foreground">{s.guardian_phone}</div>
            </div>
          </div>
        </GlassCard>

        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <GlassCard className="p-5">
                <SectionHeader title="Attendance trend" description="Hours logged over the last 14 days" />
                <AreaTrend data={attendance} keys={[{ key: "hours", label: "Hours", color: "var(--chart-1)" }]} height={200} />
              </GlassCard>
              <GlassCard className="p-5">
                <SectionHeader title="Recent activity" />
                <ul className="mt-3 space-y-3">
                  {activity.slice(0, 4).map(a => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <span className={cn("h-2 w-2 mt-1.5 rounded-full",
                        a.kind === "payment" ? "bg-success" : a.kind === "attendance" ? "bg-warning" : "bg-primary")} />
                      <div className="flex-1"><div>{a.text}</div>
                        <div className="label-mono">{a.minutesAgo < 60 ? `${a.minutesAgo}m ago` : `${Math.floor(a.minutesAgo / 60)}h ago`}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </TabsContent>

            <TabsContent value="attendance">
              <GlassCard className="p-5">
                <SectionHeader title="Attendance log" description="Last 14 days" />
                <AreaTrend data={attendance} keys={[{ key: "hours", label: "Hours", color: "var(--chart-2)" }]} height={240} />
                <ul className="mt-4 divide-y text-sm">
                  {attendance.slice().reverse().map((d, i) => (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {d.date}</span>
                      <span className="label-mono">{d.hours.toFixed(1)} h</span>
                      <StatusBadge status={d.hours > 3 ? "Present" : d.hours > 0 ? "Late" : "Absent"}
                        variant={d.hours > 3 ? "success" : d.hours > 0 ? "warning" : "destructive"} />
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </TabsContent>

            <TabsContent value="payments">
              <GlassCard className="p-5">
                <SectionHeader title="Payment history" description={s.fees_owed > 0 ? `Outstanding ₹${s.fees_owed.toLocaleString()}` : "No outstanding balance"} />
                <ul className="mt-3 divide-y text-sm">
                  {payments.map(p => (
                    <li key={p.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="font-medium">{p.month} 2026</div>
                        <div className="text-xs text-muted-foreground">{p.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">₹{p.amount.toLocaleString()}</div>
                        <StatusBadge status={p.status} variant={p.status === "Paid" ? "success" : "destructive"} />
                      </div>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </TabsContent>

            <TabsContent value="activity">
              <GlassCard className="p-5">
                <SectionHeader title="Activity timeline" />
                <ol className="mt-4 relative border-l pl-4 space-y-4">
                  {activity.map(a => (
                    <li key={a.id} className="relative">
                      <span className={cn("absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                        a.kind === "payment" ? "bg-success" : a.kind === "attendance" ? "bg-warning" : a.kind === "plan" ? "bg-primary" : "bg-muted-foreground")} />
                      <div className="text-sm">{a.text}</div>
                      <div className="label-mono">{a.minutesAgo < 60 ? `${a.minutesAgo}m ago` : `${Math.floor(a.minutesAgo / 60)}h ago`}</div>
                    </li>
                  ))}
                </ol>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
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
