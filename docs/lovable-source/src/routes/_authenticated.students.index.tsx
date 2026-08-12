import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Download, GraduationCap, Users, TrendingUp, AlertCircle,
  LayoutGrid, List, MoreHorizontal, Eye, Mail, Edit,
} from "lucide-react";
import { listPeople } from "@/lib/people.functions";
import { DEMO_STUDENTS, type DemoStudent } from "@/lib/mock/students-demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/students/")({
  head: () => ({ meta: [{ title: "Students — SmartLibrary" }] }),
  component: StudentsIndex,
});

function StudentsIndex() {
  const fetch = useServerFn(listPeople);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["students", "list"],
    queryFn: () => fetch({ data: { kind: "students" } }).catch(() => [] as any[]),
    retry: false,
  });

  const students: DemoStudent[] = useMemo(() => {
    const backend = rows as any[];
    const mapped: DemoStudent[] = backend.map((r, i) => ({
      id: r.id,
      name: r.name ?? "—",
      email: r.email ?? "—",
      phone: r.phone ?? "—",
      status: (r.status ?? "Active") as any,
      shift: (r.shift ?? "Morning") as any,
      roll_no: r.roll_no ?? "—",
      class_grade: r.class_grade ?? "—",
      guardian_name: r.guardian_name ?? "—",
      guardian_phone: r.guardian_phone ?? "—",
      seat: r.seat_id?.slice(0, 6) ?? "—",
      branch: "—",
      library: "—",
      plan: "—",
      fees_owed: Number(r.fees_owed ?? 0),
      attendance_rate: 70 + (i % 25),
      join_date: r.join_date ?? new Date(r.created_at ?? Date.now()).toISOString().slice(0, 10),
      avatar_hue: (i * 37) % 360,
    }));
    // Always include demo students so the page shows rich temp data.
    const existingIds = new Set(mapped.map(m => m.id));
    const demo = DEMO_STUDENTS.filter(d => !existingIds.has(d.id));
    return [...mapped, ...demo];
  }, [rows]);


  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [grade, setGrade] = useState<string>("All");
  const [view, setView] = useState<"table" | "grid">("table");

  const grades = Array.from(new Set(students.map(s => s.class_grade))).sort();
  const filtered = students.filter(s =>
    (status === "All" || s.status === status) &&
    (grade === "All" || s.class_grade === grade) &&
    (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase()) || s.roll_no.toLowerCase().includes(q.toLowerCase()))
  );

  const active = students.filter(s => s.status === "Active").length;
  const suspended = students.filter(s => s.status === "Suspended").length;
  const feesDue = students.reduce((s, x) => s + x.fees_owed, 0);
  const avgAtt = Math.round(students.reduce((s, x) => s + x.attendance_rate, 0) / Math.max(1, students.length));

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Students"
        description={`${students.length.toLocaleString()} enrolled${isLoading ? " · loading…" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
            <Button size="sm" asChild><Link to="/students/create"><Plus className="h-4 w-4 mr-1" /> Add student</Link></Button>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total" value={students.length} icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Active" value={active} delta={1.6} icon={<GraduationCap className="h-4 w-4" />} />
        <KpiCard label="Avg attendance" value={`${avgAtt}%`} delta={2.4} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Fees due" value={`₹${feesDue.toLocaleString()}`} hint={`${suspended} suspended`} icon={<AlertCircle className="h-4 w-4" />} />
      </section>

      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search by name, email or roll number…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {["All", "Active", "Inactive", "Suspended"].map(s => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>
            ))}
          </div>
          <select
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="All">All grades</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="inline-flex rounded-md border bg-muted/40 p-1 ml-auto">
            <button onClick={() => setView("table")} className={cn("p-1.5 rounded", view === "table" ? "bg-background shadow-sm" : "text-muted-foreground")}><List className="h-3.5 w-3.5" /></button>
            <button onClick={() => setView("grid")} className={cn("p-1.5 rounded", view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground")}><LayoutGrid className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {view === "table" ? (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-y label-mono bg-muted/30">
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Roll / Class</th>
                  <th className="px-2 py-2 font-medium">Shift</th>
                  <th className="px-2 py-2 font-medium">Attendance</th>
                  <th className="px-2 py-2 font-medium">Fees</th>
                  <th className="px-4 py-2 font-medium">Joined</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No students match your filters.</td></tr>}
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link to="/students/$studentId" params={{ studentId: s.id }} className="flex items-center gap-2 group">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ background: `oklch(0.85 0.08 ${s.avatar_hue})` }} className="text-xs text-foreground">
                            {s.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium group-hover:text-primary">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-2 py-2.5"><StatusBadge status={s.status} /></td>
                    <td className="px-2 py-2.5 text-xs">
                      <span className="font-mono">{s.roll_no}</span>
                      <span className="text-muted-foreground"> · {s.class_grade}</span>
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">{s.shift}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full", s.attendance_rate >= 80 ? "bg-success" : s.attendance_rate >= 60 ? "bg-warning" : "bg-destructive")} style={{ width: `${s.attendance_rate}%` }} />
                        </div>
                        <span className="label-mono">{s.attendance_rate}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      {s.fees_owed > 0 ? (
                        <span className="text-destructive font-medium">₹{s.fees_owed.toLocaleString()}</span>
                      ) : (
                        <span className="text-success text-xs">Paid</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.join_date}</td>
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link to="/students/$studentId" params={{ studentId: s.id }} className="flex items-center gap-2 cursor-pointer">
                              <Eye className="h-4 w-4" /> View profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/students/$studentId" params={{ studentId: s.id }} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alert(`Message ${s.name}`)} className="flex items-center gap-2 cursor-pointer">
                            <Mail className="h-4 w-4" /> Send message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(s => (
              <Link key={s.id} to="/students/$studentId" params={{ studentId: s.id }}
                className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-elegant transition group">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback style={{ background: `oklch(0.85 0.08 ${s.avatar_hue})` }} className="text-xs text-foreground">
                      {s.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate group-hover:text-primary">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.roll_no} · {s.class_grade}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">Shift <div className="text-foreground">{s.shift}</div></div>
                  <div className="text-muted-foreground">Seat <div className="text-foreground font-mono">{s.seat}</div></div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between label-mono mb-1">
                    <span>Attendance</span><span>{s.attendance_rate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full", s.attendance_rate >= 80 ? "bg-success" : s.attendance_rate >= 60 ? "bg-warning" : "bg-destructive")} style={{ width: `${s.attendance_rate}%` }} />
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <div className="col-span-full py-10 text-center text-sm text-muted-foreground">No students match your filters.</div>}
          </div>
        )}
      </GlassCard>
    </>
  );
}
