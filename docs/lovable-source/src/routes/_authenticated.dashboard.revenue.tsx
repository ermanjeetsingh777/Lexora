import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AreaTrend, BarCompare } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { revenueTrend, payments } from "@/lib/mock/data";
import { useDashboardFilters } from "@/lib/store/dashboard-filters";
import { IndianRupee, TrendingUp, Repeat, AlertTriangle, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/revenue")({
  head: () => ({ meta: [{ title: "Revenue — SmartLibrary" }] }),
  component: RevenuePage,
});

function RevenuePage() {
  const range = useDashboardFilters((s) => s.range);
  const rev = useMemo(() => revenueTrend(range), [range]);
  const total = rev.reduce((s, r) => s + r.revenue, 0);
  const renewals = rev.reduce((s, r) => s + r.renewals, 0);
  const avg = Math.round(total / rev.length);
  const paid = payments.filter((p) => p.status === "Paid").length;
  const pending = payments.filter((p) => p.status === "Pending").length;
  const failed = payments.filter((p) => p.status === "Failed").length;

  const methodMix = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => map.set(p.method, (map.get(p.method) ?? 0) + p.amount));
    return Array.from(map.entries()).map(([date, amount]) => ({ date, card: date === "Card" ? amount : 0, upi: date === "UPI" ? amount : 0, bank: date === "Bank" ? amount : 0, cash: date === "Cash" ? amount : 0 }));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Finance" title="Revenue" description="Daily revenue, renewals and payment health across every tenant."
        actions={<Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> Export</Button>}
      />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard index={0} label={`Revenue · ${range}d`} value={`₹${(total / 100000).toFixed(1)}L`} delta={5.4} icon={<IndianRupee className="h-4 w-4" />} />
        <KpiCard index={1} label="Renewals" value={`₹${(renewals / 100000).toFixed(1)}L`} delta={3.2} icon={<Repeat className="h-4 w-4" />} />
        <KpiCard index={2} label="Avg / day" value={`₹${avg.toLocaleString()}`} delta={1.1} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard index={3} label="Failed payments" value={failed} hint={`${pending} pending`} icon={<AlertTriangle className="h-4 w-4" />} />
      </section>
      <GlassCard className="p-5"><SectionHeader title={`Revenue · ${range} days`} description="Revenue vs renewals" />
        <AreaTrend data={rev} keys={[{ key: "revenue", label: "Revenue", color: "var(--chart-1)" }, { key: "renewals", label: "Renewals", color: "var(--chart-2)" }]} height={320} />
      </GlassCard>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5"><SectionHeader title="Payment method mix" />
          <BarCompare data={methodMix} keys={[
            { key: "card", label: "Card", color: "var(--chart-1)" },
            { key: "upi", label: "UPI", color: "var(--chart-2)" },
            { key: "bank", label: "Bank", color: "var(--chart-3)" },
            { key: "cash", label: "Cash", color: "var(--chart-4)" },
          ]} />
        </GlassCard>
        <GlassCard className="p-5"><SectionHeader title="Recent transactions" />
          <ul className="divide-y text-sm">
            {payments.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                <div><div className="font-medium">{p.memberName}</div><div className="label-mono">{p.invoiceId} · {p.method}</div></div>
                <div className="text-right"><div className="tabular-nums font-mono">₹{p.amount.toLocaleString()}</div>
                  <div className={`label-mono ${p.status === "Paid" ? "text-success" : p.status === "Failed" ? "text-destructive" : "text-warning"}`}>{p.status}</div></div>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center border-t pt-3">
            <div><div className="label-mono">Paid</div><div className="text-lg font-semibold text-success">{paid}</div></div>
            <div><div className="label-mono">Pending</div><div className="text-lg font-semibold text-warning">{pending}</div></div>
            <div><div className="label-mono">Failed</div><div className="text-lg font-semibold text-destructive">{failed}</div></div>
          </div>
        </GlassCard>
      </section>
    </>
  );
}
