import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { shiftRosterQuery } from "@/lib/services";
import { cn } from "@/lib/utils";
import { LogIn, LogOut, Clock, Search, Users } from "lucide-react";
import { DEMO_ROSTER, SHIFT_WINDOWS, type Shift } from "@/lib/mock/attendance-demo";
import { toast } from "sonner";

const SHIFTS: { key: Shift; window: string }[] = (Object.keys(SHIFT_WINDOWS) as Shift[]).map(k => ({ key: k, window: SHIFT_WINDOWS[k] }));

export const Route = createFileRoute("/_authenticated/attendance/shifts")({
  head: () => ({ meta: [{ title: "Shift attendance — SmartLibrary" }] }),
  component: ShiftsPage,
});

type Person = { id: string; name: string; shift: Shift; seatNumber: string | null };

function ShiftsPage() {
  const rosterQ = useQuery(shiftRosterQuery());
  const backend = (rosterQ.data ?? []) as Person[];
  const roster: Person[] = backend.length ? backend : DEMO_ROSTER;

  const [active, setActive] = useState<Shift>("Morning");
  const [dir, setDir] = useState<"in" | "out">("in");
  const [search, setSearch] = useState("");
  const [checkedOut, setCheckedOut] = useState<Set<string>>(new Set());

  const byShift = useMemo(() => {
    const map: Record<Shift, Person[]> = { Morning: [], Afternoon: [], Evening: [], Night: [] };
    for (const m of roster) map[m.shift]?.push(m);
    return map;
  }, [roster]);

  const list = byShift[active] ?? [];
  const present = Math.round(list.length * 0.72);
  const absent = list.length - present;
  const late = Math.round(list.length * 0.08);
  const rate = list.length ? Math.round((present / list.length) * 100) : 0;

  const rows = list
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 20)
    .map((m, i) => ({
      ...m,
      dir: (checkedOut.has(m.id) ? "out" : i % 4 === 0 ? "out" : "in") as "in" | "out",
      time: `${(i * 7 + 3) % 60}m ago`,
    }));

  const toggle = (id: string, name: string) => {
    setCheckedOut(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); toast.success(`${name} marked in`); }
      else { n.add(id); toast(`${name} marked out`); }
      return n;
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Attendance"
        title="Shift check-in / check-out"
        description="Track presence per shift with quick check-in and check-out actions."
        actions={<Button size="sm" variant="outline"><Users className="h-4 w-4 mr-1" /> Export roster</Button>}
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SHIFTS.map(s => {
          const count = byShift[s.key]?.length ?? 0;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={cn(
                "rounded-xl border bg-card p-4 text-left transition hover:bg-muted/40",
                active === s.key && "border-primary ring-1 ring-primary/30 shadow-elegant",
              )}
            >
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" /> {s.window}</div>
              <div className="mt-1 font-semibold flex items-center justify-between">
                {s.key}
                {active === s.key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
              <div className="label-mono mt-1">{count} assigned</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary/60" style={{ width: `${count ? 72 : 0}%` }} />
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Assigned" value={list.length} />
        <KpiCard label="Present" value={present} delta={1.4} hint={`${rate}% rate`} />
        <KpiCard label="Absent" value={absent} delta={-0.6} />
        <KpiCard label="Late" value={late} />
      </section>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <SectionHeader title={`${active} shift activity`} description={SHIFT_WINDOWS[active]} />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="h-8 pl-8 w-44 text-xs" />
            </div>
            <div className="inline-flex rounded-md border bg-muted/40 p-1">
              <button onClick={() => setDir("in")}
                className={cn("px-3 py-1.5 text-xs rounded-md font-medium inline-flex items-center gap-1",
                  dir === "in" ? "bg-background shadow-sm" : "text-muted-foreground")}>
                <LogIn className="h-3.5 w-3.5" /> Check-ins
              </button>
              <button onClick={() => setDir("out")}
                className={cn("px-3 py-1.5 text-xs rounded-md font-medium inline-flex items-center gap-1",
                  dir === "out" ? "bg-background shadow-sm" : "text-muted-foreground")}>
                <LogOut className="h-3.5 w-3.5" /> Check-outs
              </button>
            </div>
          </div>
        </div>
        <ul className="divide-y">
          {rows.filter(r => r.dir === dir).map(m => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{m.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground">Seat {m.seatNumber ?? "—"} · {m.shift}</div>
              </div>
              <StatusBadge status={dir === "in" ? "Check-in" : "Check-out"} variant={dir === "in" ? "success" : "muted"} />
              <span className="label-mono w-16 text-right">{m.time}</span>
              <Button size="sm" variant={dir === "in" ? "outline" : "default"} onClick={() => toggle(m.id, m.name)}>
                {dir === "in" ? "Mark out" : "Mark in"}
              </Button>
            </li>
          ))}
          {rows.filter(r => r.dir === dir).length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">No {dir === "in" ? "check-ins" : "check-outs"} for this shift.</li>
          )}
        </ul>
      </GlassCard>
    </>
  );
}
