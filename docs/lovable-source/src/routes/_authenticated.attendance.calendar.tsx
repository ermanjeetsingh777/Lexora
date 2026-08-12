import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { AttendanceCalendar } from "@/components/attendance-calendar";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { useQuery } from "@tanstack/react-query";
import { calendarMembersQuery } from "@/lib/services";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarCheck, LogIn, LogOut, ChevronLeft, ChevronRight, Filter, CalendarRange, CalendarDays, X } from "lucide-react";

type Shift = "Morning" | "Afternoon" | "Evening" | "Night";
const SHIFTS: Shift[] = ["Morning", "Afternoon", "Evening", "Night"];

type StatusFilter = "all" | "late" | "absent";
type Mode = "single" | "range";

export const Route = createFileRoute("/_authenticated/attendance/calendar")({
  head: () => ({ meta: [{ title: "Attendance calendar — SmartLibrary" }] }),
  component: CalendarPage,
});

function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function dayKey(d: Date) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function eachDay(start: Date, end: Date): Date[] {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  const lo = Math.min(s, e);
  const hi = Math.max(s, e);
  const out: Date[] = [];
  for (let t = lo; t <= hi; t += 86400000) out.push(new Date(t));
  return out;
}

function CalendarPage() {
  const membersQ = useQuery(calendarMembersQuery());
  const backend = (membersQ.data ?? []) as { id: string; name: string; shift: Shift }[];
  const members: { id: string; name: string; shift: Shift }[] = backend.length
    ? backend
    : Array.from({ length: 60 }, (_, i) => ({
        id: `demo_cm_${i}`,
        name: `Member ${i + 1}`,
        shift: SHIFTS[i % 4],
      }));
  const today = new Date();
  const [mode, setMode] = useState<Mode>("single");
  const [selected, setSelected] = useState<Date>(today);
  const [rangeStart, setRangeStart] = useState<Date | null>(today);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(today);
  const [yearMonth, setYearMonth] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([...SHIFTS]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const days = useMemo<Date[]>(() => {
    if (mode === "single") return [selected];
    if (rangeStart && rangeEnd) return eachDay(rangeStart, rangeEnd);
    if (rangeStart) return [rangeStart];
    return [];
  }, [mode, selected, rangeStart, rangeEnd]);

  const summary = useMemo(() => {
    const byShift: Record<Shift, { assigned: number; in: number; out: number; late: number; absent: number }> = {
      Morning: { assigned: 0, in: 0, out: 0, late: 0, absent: 0 },
      Afternoon: { assigned: 0, in: 0, out: 0, late: 0, absent: 0 },
      Evening: { assigned: 0, in: 0, out: 0, late: 0, absent: 0 },
      Night: { assigned: 0, in: 0, out: 0, late: 0, absent: 0 },
    };

    for (const day of days) {
      const key = dayKey(day);
      for (const m of members) {
        const s = m.shift as Shift;
        if (!byShift[s]) continue;
        if (!selectedShifts.includes(s)) continue;

        byShift[s].assigned += 1;
        const r = seeded(key + m.id.length + s.charCodeAt(0));
        const present = r > 0.18;
        const isLate = r > 0.88;
        const hasOut = r > 0.55;

        if (present) {
          byShift[s].in += 1;
          if (hasOut) byShift[s].out += 1;
          if (isLate) byShift[s].late += 1;
        } else {
          byShift[s].absent += 1;
        }
      }
    }

    const total = SHIFTS.reduce(
      (acc, s) => {
        acc.assigned += byShift[s].assigned;
        acc.in += byShift[s].in;
        acc.out += byShift[s].out;
        acc.late += byShift[s].late;
        acc.absent += byShift[s].absent;
        return acc;
      },
      { assigned: 0, in: 0, out: 0, late: 0, absent: 0 },
    );

    return { byShift, total };
  }, [days, selectedShifts, members]);

  const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });
  const headerLabel =
    mode === "single"
      ? (selected.toDateString() === today.toDateString() ? "Today · " : "") +
        selected.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })
      : rangeStart && rangeEnd
        ? `${fmt(rangeStart)} → ${fmt(rangeEnd)} · ${days.length} day${days.length === 1 ? "" : "s"}`
        : rangeStart
          ? `${fmt(rangeStart)} · pick end date`
          : "Pick a start date";

  const monthName = new Date(yearMonth.year, yearMonth.month, 1).toLocaleString("en", { month: "long" });

  const prevMonth = () =>
    setYearMonth((p) => (p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 }));
  const nextMonth = () =>
    setYearMonth((p) => (p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 }));

  const handleSelect = (date: Date) => {
    setYearMonth({ year: date.getFullYear(), month: date.getMonth() });
    if (mode === "single") {
      setSelected(date);
      return;
    }
    // range mode: 1st click sets start, 2nd sets end, 3rd resets
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
    } else {
      setRangeEnd(date);
    }
  };

  const visibleShifts = SHIFTS.filter((s) => selectedShifts.includes(s));
  const avg = days.length > 1
    ? { in: Math.round(summary.total.in / days.length), assigned: Math.round(summary.total.assigned / days.length) }
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Attendance"
        title="Monthly calendar"
        description="Switch to range mode to aggregate KPIs across multiple days, by shift and late/absent status."
        actions={
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary/80" /> Present</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-warning/70" /> Late</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/70" /> Absent</span>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Mode</span>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => {
              if (!v) return;
              const next = v as Mode;
              setMode(next);
              if (next === "range") {
                setRangeStart(selected);
                setRangeEnd(selected);
              }
            }}
            className="gap-1"
          >
            <ToggleGroupItem value="single" className="text-xs px-2.5 py-1 h-7 gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <CalendarDays className="h-3 w-3" /> Single
            </ToggleGroupItem>
            <ToggleGroupItem value="range" className="text-xs px-2.5 py-1 h-7 gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <CalendarRange className="h-3 w-3" /> Range
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Shifts</span>
          <ToggleGroup
            type="multiple"
            value={selectedShifts}
            onValueChange={(v) => setSelectedShifts(v.length ? (v as Shift[]) : [])}
            className="gap-1"
          >
            {SHIFTS.map((s) => (
              <ToggleGroupItem key={s} value={s} className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {s}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
            className="gap-1"
          >
            <ToggleGroupItem value="all" className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">All</ToggleGroupItem>
            <ToggleGroupItem value="late" className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Late</ToggleGroupItem>
            <ToggleGroupItem value="absent" className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Absent</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <GlassCard className="p-6">
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs"
          >
            <span className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
              {mode === "range" ? "Range" : "Day"}
            </span>
            {mode === "range" ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-foreground">
                  <span className="text-[9px] font-bold text-primary">START</span>
                  {rangeStart ? fmt(rangeStart) : "—"}
                </span>
                <span aria-hidden="true" className="text-muted-foreground">→</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-foreground">
                  <span className="text-[9px] font-bold text-primary">END</span>
                  {rangeEnd ? fmt(rangeEnd) : "—"}
                </span>
                <span className="text-muted-foreground">
                  · {days.length} day{days.length === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="font-mono text-foreground">
                {selected.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            )}
            {selectedShifts.length < 4 && (
              <span className="text-muted-foreground">· {selectedShifts.join(", ")}</span>
            )}
            {statusFilter !== "all" && (
              <span className="text-muted-foreground">· {statusFilter}</span>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{monthName} {yearMonth.year}</h3>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1 rounded-md hover:bg-muted transition" aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setYearMonth({ year: today.getFullYear(), month: today.getMonth() });
                  setSelected(today);
                  if (mode === "range") {
                    setRangeStart(today);
                    setRangeEnd(today);
                  }
                }}
                className="px-2 py-1 text-xs rounded-md hover:bg-muted transition font-medium"
              >
                Today
              </button>
              <button onClick={nextMonth} className="p-1 rounded-md hover:bg-muted transition" aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <AttendanceCalendar
            year={yearMonth.year}
            month={yearMonth.month}
            selected={mode === "single" ? selected : null}
            onSelect={handleSelect}
            rangeStart={mode === "range" ? rangeStart : null}
            rangeEnd={mode === "range" ? rangeEnd : null}
            mode={mode}
          />
          {mode === "range" && (
            <div className="mt-3 flex items-center justify-between">
              <p className="label-mono" aria-live="polite">
                {rangeStart && !rangeEnd
                  ? `${fmt(rangeStart)} selected — pick the end date (use arrow keys + Enter)`
                  : rangeStart && rangeEnd
                    ? `${fmt(rangeStart)} → ${fmt(rangeEnd)} · click any day to start over`
                    : "Click a day to set the start of the range"}
              </p>
              {(rangeStart || rangeEnd) && (
                <button
                  onClick={() => {
                    setRangeStart(null);
                    setRangeEnd(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted transition"
                  aria-label="Clear range selection"
                >
                  <X className="h-3 w-3" /> Clear selection
                </button>
              )}
            </div>
          )}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <SectionHeader
              title={headerLabel}
              description={
                `${summary.total.in} of ${summary.total.assigned} checked in` +
                (avg ? ` · avg ${avg.in}/${avg.assigned} per day` : "") +
                (selectedShifts.length < 4 ? ` · ${selectedShifts.join(", ")}` : "")
              }
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <KpiCard
                label={statusFilter === "all" ? "Check-ins" : statusFilter === "late" ? "Late arrivals" : "Absent"}
                value={statusFilter === "all" ? summary.total.in : statusFilter === "late" ? summary.total.late : summary.total.absent}
                icon={statusFilter === "all" ? <LogIn className="h-4 w-4" /> : statusFilter === "late" ? <CalendarCheck className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              />
              <KpiCard label="Check-outs" value={summary.total.out} icon={<LogOut className="h-4 w-4" />} />
              <KpiCard label="Absent" value={summary.total.absent} />
              <KpiCard label="Late" value={summary.total.late} icon={<CalendarCheck className="h-4 w-4" />} />
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <SectionHeader
              title="Per-shift breakdown"
              description={
                (visibleShifts.length < 4 ? `Showing ${visibleShifts.join(", ")}` : "All shifts") +
                (days.length > 1 ? ` · aggregated over ${days.length} days` : "")
              }
            />
            <ul className="mt-3 divide-y">
              {visibleShifts.map((s) => {
                const row = summary.byShift[s];
                const pct = row.assigned === 0 ? 0 : Math.round((row.in / row.assigned) * 100);
                return (
                  <li key={s} className="py-3 flex items-center gap-3">
                    <div className="w-20">
                      <div className="text-sm font-medium">{s}</div>
                      <div className="label-mono">{row.assigned} assigned</div>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 label-mono">
                        <span className="inline-flex items-center gap-1"><LogIn className="h-3 w-3" />{row.in}</span>
                        <span className="inline-flex items-center gap-1"><LogOut className="h-3 w-3" />{row.out}</span>
                        {row.late > 0 && <StatusBadge status={`${row.late} late`} variant="warning" />}
                        {row.absent > 0 && <StatusBadge status={`${row.absent} absent`} variant="destructive" />}
                      </div>
                    </div>
                    <div className="text-sm font-semibold w-10 text-right">{pct}%</div>
                  </li>
                );
              })}
              {visibleShifts.length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">Select at least one shift to see data.</li>
              )}
            </ul>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
