import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AreaTrend, BarCompare, Donut } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { attendanceTrendQuery } from "@/lib/services";
import { CalendarCheck, Clock, TrendingUp, Users, Download, ArrowRight } from "lucide-react";
import { DEMO_TREND_30D, DEMO_HOURLY_TODAY, peakHourLabel, DEMO_ROSTER } from "@/lib/mock/attendance-demo";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/attendance/")({
  head: () => ({ meta: [{ title: "Attendance — SmartLibrary" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const q = useQuery(attendanceTrendQuery(30));
  const backend = (q.data ?? []) as any[];
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const att = useMemo(() => {
    const src = backend.length ? backend : DEMO_TREND_30D;
    return src.slice(-range);
  }, [backend, range]);

  const total = att.reduce((s, d) => s + d.present, 0);
  const late = att.reduce((s, d) => s + d.late, 0);
  const absent = att.reduce((s, d) => s + d.absent, 0);
  const avgDaily = Math.round(total / Math.max(1, att.length));
  const attendanceRate = Math.round((total / Math.max(1, total + absent)) * 100);

  const shiftMix = [
    { name: "Morning", value: DEMO_ROSTER.filter(r => r.shift === "Morning").length, color: "var(--chart-1)" },
    { name: "Afternoon", value: DEMO_ROSTER.filter(r => r.shift === "Afternoon").length, color: "var(--chart-2)" },
    { name: "Evening", value: DEMO_ROSTER.filter(r => r.shift === "Evening").length, color: "var(--chart-3)" },
    { name: "Night", value: DEMO_ROSTER.filter(r => r.shift === "Night").length, color: "var(--chart-4)" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Attendance"
        description="Daily attendance, late arrivals and shift breakdown."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border bg-muted/40 p-1">
              {([7, 14, 30] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium ${range === r ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  {r}d
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={`Present (${range}d)`} value={total.toLocaleString()} delta={2.1} icon={<CalendarCheck className="h-4 w-4" />} />
        <KpiCard label="Attendance rate" value={`${attendanceRate}%`} delta={1.2} hint={`avg ${avgDaily}/day`} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Late arrivals" value={late} delta={-0.8} icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Peak hour" value={peakHourLabel()} hint="92% occupancy" icon={<Users className="h-4 w-4" />} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <SectionHeader title="Present vs Absent" description={`Last ${range} days`} />
          <BarCompare
            data={att}
            keys={[
              { key: "present", label: "Present", color: "var(--chart-1)" },
              { key: "absent", label: "Absent", color: "var(--chart-3)" },
            ]}
            height={260}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Shift mix" description="Roster distribution" />
          <Donut data={shiftMix} height={220} />
        </GlassCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <SectionHeader title="Late arrivals trend" description={`Rolling ${range} days`} />
          <AreaTrend data={att} keys={[{ key: "late", label: "Late", color: "var(--chart-4)" }]} height={220} />
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Today by hour" description="Check-ins across the day" />
            <Link to="/attendance/live" className="text-xs font-medium text-primary inline-flex items-center gap-1">
              Live feed <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <BarCompare
            data={DEMO_HOURLY_TODAY.map(h => ({ date: h.label, checkins: h.checkins }))}
            keys={[{ key: "checkins", label: "Check-ins", color: "var(--chart-2)" }]}
            height={220}
          />
        </GlassCard>
      </section>
    </>
  );
}
