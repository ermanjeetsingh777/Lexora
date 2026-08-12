import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, GlassCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AreaTrend, BarCompare, OccupancyHeatmap, Donut } from "@/components/charts";
import { attendanceTrend, revenueTrend, occupancyHeatmap } from "@/lib/mock/data";
import { Download, FileBarChart } from "lucide-react";

const reports = [
  { title: "Revenue", desc: "Daily revenue, renewals and churn.", kind: "area" },
  { title: "Attendance", desc: "Daily attendance and late arrivals.", kind: "bar" },
  { title: "Occupancy heatmap", desc: "Weekly occupancy density.", kind: "heatmap" },
  { title: "Subscription distribution", desc: "Active plans breakdown.", kind: "donut" },
  { title: "Branch comparison", desc: "Cross-branch performance.", kind: "bar" },
  { title: "Member growth", desc: "New vs churned members.", kind: "area" },
];

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — SmartLibrary" }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Insights" title="Reports" description="Catalog of cross-tenant analytical reports." actions={<Button size="sm"><FileBarChart className="h-4 w-4 mr-1" /> Custom report</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <GlassCard key={r.title} className="p-5 hover-lift">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold">{r.title}</div>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Export</Button>
            </div>
            {r.kind === "area" && <AreaTrend data={revenueTrend(20)} keys={[{key:"revenue",label:"Revenue",color:"var(--chart-1)"}]} height={140} />}
            {r.kind === "bar" && <BarCompare data={attendanceTrend(10)} keys={[{key:"present",label:"Present",color:"var(--chart-1)"},{key:"late",label:"Late",color:"var(--chart-4)"}]} height={140} />}
            {r.kind === "heatmap" && <OccupancyHeatmap {...occupancyHeatmap()} />}
            {r.kind === "donut" && <Donut data={[{name:"Monthly",value:480,color:"var(--chart-1)"},{name:"Quarterly",value:320,color:"var(--chart-2)"},{name:"Annual",value:484,color:"var(--chart-3)"}]} height={160} />}
          </GlassCard>
        ))}
      </div>
    </>
  ),
});
