import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/store/auth";
import { useServerFn } from "@tanstack/react-start";
import { createInstitution } from "@/lib/org.functions";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OnboardingStepper } from "@/components/onboarding-stepper";
import { GlassCard } from "@/components/page-header";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/institution")({
  head: () => ({ meta: [{ title: "Set up your institution — SmartLibrary" }] }),
  component: Page,
});

function Page() {
  const { isAuthenticated, initialized } = useAuth();
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const create = useServerFn(createInstitution);
  const [form, setForm] = useState({ name: "", type: "College", city: "", country: "India", email: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialized && !isAuthenticated) navigate({ to: "/login" });
  }, [initialized, isAuthenticated, navigate]);

  if (!initialized || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background blueprint-grid">
      <div className="mx-auto max-w-2xl p-8">
        <p className="label-mono">Welcome</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1 mb-6">Set up your workspace</h1>
        <OnboardingStepper current="institution" />
        <GlassCard className="p-6">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await create({ data: form });
                await qc.invalidateQueries({ queryKey: ["onboarding-status"] });
                toast.success("Institution created");
                navigate({ to: "/onboarding/branch" });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              } finally { setBusy(false); }
            }}
          >
            <div className="space-y-1.5"><Label>Institution name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Meridian Institute" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="School">School</SelectItem>
                    <SelectItem value="College">College</SelectItem>
                    <SelectItem value="Library">Library</SelectItem>
                    <SelectItem value="CoachingCenter">Coaching Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Contact phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Contact email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Continue to branches →"}</Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
