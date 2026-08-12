import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBranches, createLibrary } from "@/lib/org.functions";
import { PageHeader, GlassCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const search = z.object({ branchId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/libraries/create")({
  head: () => ({ meta: [{ title: "New library — SmartLibrary" }] }),
  validateSearch: (s) => search.parse(s),
  component: Page,
});

function Page() {
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const { branchId: preselected } = Route.useSearch();
  const fetchBranches = useServerFn(listBranches);
  const create = useServerFn(createLibrary);
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => fetchBranches({ data: {} }) });
  const [form, setForm] = useState({
    branchId: preselected ?? "", name: "", floor: 1, capacity: 60, autoSeed: true,
  });
  const [busy, setBusy] = useState(false);

  return (
    <>
      <PageHeader eyebrow="Organization · Libraries" title="New library" description="Add a library space inside a branch." />
      <GlassCard className="p-6 max-w-2xl">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.branchId) return toast.error("Pick a branch");
            setBusy(true);
            try {
              const row = await create({ data: form });
              await qc.invalidateQueries({ queryKey: ["libraries"] });
              toast.success("Library created");
              navigate({ to: "/libraries/$libraryId", params: { libraryId: row.id } });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed");
            } finally { setBusy(false); }
          }}
        >
          <div className="space-y-1.5">
            <Label>Branch *</Label>
            <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {(branches as any[]).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Library name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Library" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Floor</Label><Input type="number" min={0} value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Capacity (seats)</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={form.autoSeed} onCheckedChange={(v) => setForm({ ...form, autoSeed: v })} />
            <div>
              <div className="text-sm font-medium">Auto-seed seats</div>
              <div className="label-mono">Pre-generate {form.capacity} seats across sections A–D.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create library"}</Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/libraries" })}>Cancel</Button>
          </div>
        </form>
      </GlassCard>
    </>
  );
}
