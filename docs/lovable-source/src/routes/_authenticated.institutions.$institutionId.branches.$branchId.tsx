import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { branches, libraries, institutions } from "@/lib/mock/data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/institutions/$institutionId/branches/$branchId")({
  head: () => ({ meta: [{ title: "Branch — SmartLibrary" }] }),
  component: () => {
    const { institutionId, branchId } = useParams({ from: "/_authenticated/institutions/$institutionId/branches/$branchId" });
    const inst = institutions.find((i) => i.id === institutionId) ?? institutions[0];
    const b = branches.find((x) => x.id === branchId) ?? branches[0];
    const libs = libraries.filter((l) => l.branchId === b.id);
    return (
      <>
        <PageHeader
          eyebrow={<Link to="/institutions/$institutionId" params={{ institutionId: inst.id }} className="inline-flex items-center label-mono hover:text-foreground"><ArrowLeft className="h-3 w-3 mr-1" />{inst.name}</Link> as any}
          title={b.name}
          description={`${b.city} · ${libs.length} libraries · capacity ${b.capacity}`}
        />
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Members" value={b.members} />
          <KpiCard label="Capacity" value={b.capacity} />
          <KpiCard label="Occupancy" value={`${b.occupancy}%`} />
          <KpiCard label="Libraries" value={b.libraries} />
        </section>
        <GlassCard className="p-5">
          <SectionHeader title="Libraries in this branch" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {libs.map((l) => (
              <div key={l.id} className="rounded-lg border p-4 hover-lift">
                <div className="font-medium">{l.name}</div>
                <div className="label-mono mt-0.5">Floor {l.floor}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div><div className="label-mono">Capacity</div><div className="font-semibold tabular-nums">{l.capacity}</div></div>
                  <div><div className="label-mono">Occupied</div><div className="font-semibold tabular-nums">{l.occupied}</div></div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(l.occupied/l.capacity*100)}%` }} /></div>
              </div>
            ))}
          </div>
        </GlassCard>
      </>
    );
  },
});
