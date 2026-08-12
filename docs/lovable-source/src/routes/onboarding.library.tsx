import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/store/auth";
import { useServerFn } from "@tanstack/react-start";
import { createLibrary, getOnboardingStatus } from "@/lib/org.functions";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { GlassCard } from "@/components/page-header";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/library")({
  head: () => ({ meta: [{ title: "Add a library — SmartLibrary" }] }),
  component: Page,
});

function Page() {
  const { isAuthenticated, initialized } = useAuth();
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getOnboardingStatus);
  const create = useServerFn(createLibrary);
  const { data: status } = useQuery({ queryKey: ["onboarding-status", isAuthenticated], queryFn: () => fetchStatus(), enabled: !!isAuthenticated });
  const [form, setForm] = useState({ name: "Main Library", floor: 1, capacity: 60 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialized && !isAuthenticated) navigate({ to: "/login" });
  }, [initialized, isAuthenticated, navigate]);
  useEffect(() => {
    if (status?.step === "institution") navigate({ to: "/onboarding/institution" });
    if (status?.step === "branch") navigate({ to: "/onboarding/branch" });
  }, [status, navigate]);

  if (!initialized || !isAuthenticated || !status?.branch) return null;

  return (
    <div className="min-h-screen bg-background blueprint-grid">
      <div className="mx-auto max-w-2xl p-8">
        <p className="label-mono">Step 3 of 3</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1 mb-6">Add your first library to <span className="text-primary">{status.branch.name}</span></h1>
        <OnboardingStepper current="library" />
        <GlassCard className="p-6">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await create({ data: { branchId: status.branch!.id, ...form, autoSeed: true } });
                await qc.invalidateQueries({ queryKey: ["onboarding-status"] });
                toast.success("Library created with seat layout");
                navigate({ to: "/dashboard" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              } finally { setBusy(false); }
            }}
          >
            <div className="space-y-1.5"><Label>Library name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Floor</Label><Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 1 })} /></div>
              <div className="space-y-1.5"><Label>Seat capacity</Label><Input type="number" min={1} max={500} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 60 })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">We'll auto-generate {form.capacity} seats organized into sections A–D.</p>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Setting up…" : "Finish setup →"}</Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
