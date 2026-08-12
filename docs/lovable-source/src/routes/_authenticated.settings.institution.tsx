import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInstitutions, updateInstitution } from "@/lib/org.functions";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/institution")({
  head: () => ({ meta: [{ title: "Institution — SmartLibrary" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchInsts = useServerFn(listInstitutions);
  const update = useServerFn(updateInstitution);
  const { data: insts = [], isLoading } = useQuery({ queryKey: ["institutions"], queryFn: () => fetchInsts() });
  const inst = (insts as any[])[0];
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (inst) setForm({ ...inst }); }, [inst]);

  if (isLoading || !form) {
    return <GlassCard className="p-6 text-sm text-muted-foreground">Loading institution…</GlassCard>;
  }

  const save = async (patch: any) => {
    try {
      await update({ data: { id: form.id, patch } });
      await qc.invalidateQueries({ queryKey: ["institutions"] });
      toast.success("Saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title={form.name}
        description={`${form.type} · ${form.city ?? "—"}, ${form.country ?? "—"}`}
        actions={
          <>
            <Badge variant={form.status === "Active" ? "default" : "secondary"}>{form.status}</Badge>
            <Button size="sm" variant={form.status === "Active" ? "destructive" : "default"}
              onClick={() => save({ status: form.status === "Active" ? "Inactive" : "Active" })}>
              {form.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
          </>
        }
      />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="license">License & Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <GlassCard className="p-5">
            <SectionHeader title="Institution profile" />
            <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); save({ name: form.name, type: form.type, city: form.city, state: form.state, country: form.country, address: form.address }); }}>
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Type</Label>
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
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>State</Label><Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="col-span-2"><Button type="submit">Save profile</Button></div>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="branding">
          <GlassCard className="p-5">
            <SectionHeader title="Branding" description="Logo URL used across customer-facing pages and emails." />
            <form className="space-y-3 max-w-xl" onSubmit={(e) => { e.preventDefault(); save({ logo_url: form.logo_url }); }}>
              <div className="space-y-1.5"><Label>Logo URL</Label><Input type="url" placeholder="https://…" value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
              {form.logo_url && (
                <div className="rounded-lg border p-3 flex items-center gap-3">
                  <img src={form.logo_url} alt="Logo preview" className="h-12 w-12 rounded object-contain border" />
                  <span className="label-mono">Preview</span>
                </div>
              )}
              <Button type="submit">Save branding</Button>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="contact">
          <GlassCard className="p-5">
            <SectionHeader title="Contact information" />
            <form className="grid grid-cols-2 gap-3 max-w-xl" onSubmit={(e) => { e.preventDefault(); save({ email: form.email, phone: form.phone }); }}>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="col-span-2"><Button type="submit">Save contact</Button></div>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="license">
          <GlassCard className="p-5">
            <SectionHeader title="License & subscription plan" />
            <form className="grid grid-cols-2 gap-3 max-w-xl" onSubmit={(e) => { e.preventDefault(); save({ license_key: form.license_key, subscription_plan: form.subscription_plan }); }}>
              <div className="space-y-1.5 col-span-2"><Label>License key</Label><Input value={form.license_key ?? ""} onChange={(e) => setForm({ ...form, license_key: e.target.value })} placeholder="SL-XXXX-XXXX-XXXX" /></div>
              <div className="space-y-1.5 col-span-2">
                <Label>Subscription plan</Label>
                <Select value={form.subscription_plan ?? "Starter"} onValueChange={(v) => setForm({ ...form, subscription_plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Button type="submit">Save license</Button></div>
            </form>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </>
  );
}
