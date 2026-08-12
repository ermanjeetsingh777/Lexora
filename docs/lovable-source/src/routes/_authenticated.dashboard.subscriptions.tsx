import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AreaTrend, Donut } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { plans, revenueTrend, payments } from "@/lib/mock/data";
import { useDashboardFilters } from "@/lib/store/dashboard-filters";
import { CreditCard, TrendingUp, Users, Repeat, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions · Dashboard — SmartLibrary" }] }),
  component: SubsDashPage,
});

function SubsDashPage() {
  const range = useDashboardFilters((s) => s.range);
  const rev = useMemo(() => revenueTrend(range), [range]);
  const mrr = Math.round(rev.reduce((s, r) => s + r.revenue, 0) * 0.55);
  const arr = mrr * 12;
  const activeSubs = 1284;
  const churn = 2.3;
  const renewals30 = payments.filter((p) => p.status === "Paid").length * 12;

  const distribution = plans.map((p, i) => ({
    name: p.name,
    value: [480, 320, 344, 140][i] ?? 100,
    color: `var(--chart-${(i % 5) + 1})`,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Subscriptions" title="Subscription analytics"
        description="MRR, ARR, plan distribution and renewal health."
        actions={<Button size="sm" asChild><Link to="/subscriptions">Manage <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>}
      />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label={`MRR · ${range}d`} value={`₹${(mrr / 100000).toFixed(1)}L`} delta={4.8} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard index={1} label="ARR" value={`₹${(arr / 10000000).toFixed(2)}Cr`} delta={5.2} icon={<CreditCard className="h-4 w-4" />} />
        <KpiCard index={2} label="Active subscriptions" value={activeSubs.toLocaleString()} delta={2.1} icon={<Users className="h-4 w-4" />} />
        <KpiCard index={3} label="Monthly churn" value={`${churn}%`} delta={-0.4} hint={`${renewals30} renewals`} icon={<Repeat className="h-4 w-4" />} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2"><SectionHeader title="MRR & ARR" description="Estimated recurring revenue" />
          <AreaTrend data={rev.map((r) => ({ date: r.date, mrr: Math.round(r.revenue * 0.55), arr: Math.round(r.revenue * 0.4) }))}
            keys={[{ key: "mrr", label: "MRR", color: "var(--chart-2)" }, { key: "arr", label: "ARR", color: "var(--chart-5)" }]} height={280} />
        </GlassCard>
        <GlassCard className="p-5"><SectionHeader title="Plan distribution" />
          <Donut data={distribution} />
        </GlassCard>
      </section>
      <GlassCard className="p-5"><SectionHeader title="Plans" description="Active plan catalog" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((p, i) => (
            <div key={p.id} className="rounded-lg border p-4 hover-lift">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{p.name}</div>
                <Badge variant="outline" className="text-[10px]">{p.billingCycle}</Badge>
              </div>
              <div className="text-2xl font-semibold tabular-nums">₹{p.price.toLocaleString()}</div>
              <div className="label-mono mt-1">up to {p.maxMembers.toLocaleString()} members</div>
              <div className="mt-3 text-xs text-muted-foreground">{distribution[i]?.value ?? 0} active</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
