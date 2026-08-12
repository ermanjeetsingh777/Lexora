import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { BarCompare, Donut } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { attendanceTrend, members } from "@/lib/mock/data";
import { useDashboardFilters } from "@/lib/store/dashboard-filters";
import { Users, Clock, CheckCircle2, XCircle, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/attendance")({
  head: () => ({ meta: [{ title: "Attendance · Dashboard — SmartLibrary" }] }),
  component: AttendanceDashPage,
});

function AttendanceDashPage() {
  const range = useDashboardFilters((s) => s.range);
  const data = useMemo(() => attendanceTrend(range), [range]);
  const totalPresent = data.reduce((s, d) => s + d.present, 0);
  const totalLate = data.reduce((s, d) => s + d.late, 0);
  const totalAbsent = data.reduce((s, d) => s + Math.max(0, d.absent), 0);
  const avg = Math.round(totalPresent / data.length);
  const rate = Math.round((totalPresent / (totalPresent + totalAbsent)) * 100);

  const shiftMix = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => map.set(m.shift, (map.get(m.shift) ?? 0) + 1));
    const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Attendance" title="Attendance overview"
        description="Presence, punctuality and shift mix across all branches."
        actions={<Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Export</Button>}
      />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label="Avg present / day" value={avg} delta={2.4} icon={<Users className="h-4 w-4" />} />
        <KpiCard index={1} label="Attendance rate" value={`${rate}%`} delta={1.1} icon={<CheckCircle2 className="h-4 w-4" />} />
        <KpiCard index={2} label="Late arrivals" value={totalLate} delta={-3.2} icon={<Clock className="h-4 w-4" />} />
        <KpiCard index={3} label="Absent (total)" value={totalAbsent} delta={-1.4} icon={<XCircle className="h-4 w-4" />} />
      </section>
      <GlassCard className="p-5"><SectionHeader title={`Attendance · ${range} days`} description="Present, late & absent" />
        <BarCompare data={data} keys={[
          { key: "present", label: "Present", color: "var(--chart-1)" },
          { key: "late", label: "Late", color: "var(--chart-4)" },
          { key: "absent", label: "Absent", color: "var(--chart-3)" },
        ]} height={320} />
      </GlassCard>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5"><SectionHeader title="Shift distribution" />
          <Donut data={shiftMix} />
        </GlassCard>
        <GlassCard className="p-5"><SectionHeader title="Punctuality this period" />
          <div className="space-y-3">
            {[
              { label: "On time", value: totalPresent - totalLate, color: "bg-success" },
              { label: "Late", value: totalLate, color: "bg-warning" },
              { label: "Absent", value: totalAbsent, color: "bg-destructive" },
            ].map((r) => {
              const pct = Math.round((r.value / (totalPresent + totalAbsent || 1)) * 100);
              return (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-sm mb-1"><span>{r.label}</span><span className="tabular-nums font-mono text-xs">{r.value} · {pct}%</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${r.color}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>
    </>
  );
}
