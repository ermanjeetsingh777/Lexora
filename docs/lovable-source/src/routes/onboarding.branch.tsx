import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/store/auth";
import { useServerFn } from "@tanstack/react-start";
import { createBranch, getOnboardingStatus } from "@/lib/org.functions";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { GlassCard } from "@/components/page-header";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/branch")({
  head: () => ({ meta: [{ title: "Add a branch — SmartLibrary" }] }),
  component: Page,
});

function Page() {
  const { isAuthenticated, initialized } = useAuth();
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getOnboardingStatus);
  const create = useServerFn(createBranch);
  const { data: status } = useQuery({ queryKey: ["onboarding-status", isAuthenticated], queryFn: () => fetchStatus(), enabled: !!isAuthenticated });
  const [form, setForm] = useState({ name: "", city: "", address: "", capacity: 100 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialized && !isAuthenticated) navigate({ to: "/login" });
  }, [initialized, isAuthenticated, navigate]);
  useEffect(() => {
    if (status?.step === "institution") navigate({ to: "/onboarding/institution" });
  }, [status, navigate]);

  if (!initialized || !isAuthenticated || !status?.institution) return null;

  return (
    <div className="min-h-screen bg-background blueprint-grid">
      <div className="mx-auto max-w-2xl p-8">
        <p className="label-mono">Step 2 of 3</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1 mb-6">Add your first branch to <span className="text-primary">{status.institution.name}</span></h1>
        <OnboardingStepper current="branch" />
        <GlassCard className="p-6">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await create({ data: { institutionId: status.institution!.id, ...form } });
                await qc.invalidateQueries({ queryKey: ["onboarding-status"] });
                toast.success("Branch created");
                navigate({ to: "/onboarding/library" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              } finally { setBusy(false); }
            }}
          >
            <div className="space-y-1.5"><Label>Branch name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Central Campus" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 100 })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Continue to library →"}</Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
