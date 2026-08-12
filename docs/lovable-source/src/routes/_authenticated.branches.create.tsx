import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInstitutions, createBranch } from "@/lib/org.functions";
import { PageHeader, GlassCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/branches/create")({
  head: () => ({ meta: [{ title: "New branch — SmartLibrary" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const fetchInsts = useServerFn(listInstitutions);
  const create = useServerFn(createBranch);
  const { data: insts = [] } = useQuery({ queryKey: ["institutions"], queryFn: () => fetchInsts() });
  const [form, setForm] = useState({
    institutionId: "", name: "", city: "", address: "", capacity: 100,
  });
  const [busy, setBusy] = useState(false);

  return (
    <>
      <PageHeader eyebrow="Organization · Branches" title="New branch" description="Add a physical location to your institution." />
      <GlassCard className="p-6 max-w-2xl">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.institutionId) return toast.error("Pick an institution");
            setBusy(true);
            try {
              const row = await create({ data: form });
              await qc.invalidateQueries({ queryKey: ["branches"] });
              toast.success("Branch created");
              navigate({ to: "/branches/$branchId", params: { branchId: row.id } });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed");
            } finally { setBusy(false); }
          }}
        >
          <div className="space-y-1.5">
            <Label>Institution *</Label>
            <Select value={form.institutionId} onValueChange={(v) => setForm({ ...form, institutionId: v })}>
              <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
              <SelectContent>
                {(insts as any[]).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Branch name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Branch" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create branch"}</Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/branches" })}>Cancel</Button>
          </div>
        </form>
      </GlassCard>
    </>
  );
}
