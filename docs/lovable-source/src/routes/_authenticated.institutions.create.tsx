import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createInstitution, createBranch, updateInstitution } from "@/lib/org.functions";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Building2, MapPin, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/institutions/create")({
  head: () => ({ meta: [{ title: "New institution — SmartLibrary" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const createInst = useServerFn(createInstitution);
  const createBr = useServerFn(createBranch);
  const updateInst = useServerFn(updateInstitution);

  const [tab, setTab] = useState("profile");
  const [busy, setBusy] = useState(false);
  const [institution, setInstitution] = useState<any | null>(null);

  const [profile, setProfile] = useState({
    name: "", type: "Library", email: "", phone: "", city: "", country: "India",
  });
  const [branch, setBranch] = useState({ name: "Main Branch", city: "", address: "", capacity: 100 });
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const row = await createInst({ data: profile });
      setInstitution(row);
      await qc.invalidateQueries({ queryKey: ["institutions"] });
      toast.success("Institution created");
      setBranch((b) => ({ ...b, city: profile.city || b.city }));
      setTab("branch");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  async function submitBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!institution) return toast.error("Create institution first");
    setBusy(true);
    try {
      await createBr({ data: { ...branch, institutionId: institution.id } });
      await qc.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch added");
      setTab("activation");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  async function submitActivation() {
    if (!institution) return toast.error("Create institution first");
    setBusy(true);
    try {
      const row = await updateInst({ data: { id: institution.id, patch: { status } } });
      setInstitution(row);
      await qc.invalidateQueries({ queryKey: ["institutions"] });
      toast.success(`Institution ${status.toLowerCase()}`);
      navigate({ to: "/institutions" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        eyebrow="Organization · Institutions"
        title="New institution"
        description="Set up an institution profile, add its first branch, and control activation."
        actions={institution ? <StatusBadge status={institution.status ?? "Active"} /> : null}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile"><Building2 className="h-3.5 w-3.5 mr-1" />Profile {institution && <Check className="h-3 w-3 ml-1 text-emerald-500" />}</TabsTrigger>
          <TabsTrigger value="branch" disabled={!institution}><MapPin className="h-3.5 w-3.5 mr-1" />Branch</TabsTrigger>
          <TabsTrigger value="activation" disabled={!institution}><Power className="h-3.5 w-3.5 mr-1" />Activation</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <GlassCard className="p-6 max-w-2xl">
            <SectionHeader title="Institution profile" />
            <form className="space-y-4" onSubmit={submitProfile}>
              <div className="space-y-1.5"><Label>Name *</Label><Input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Acme Library Network" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={profile.type} onValueChange={(v) => setProfile({ ...profile, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Library", "College", "University", "School", "Coaching", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>City</Label><Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Country</Label><Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy || !!institution}>{institution ? "Created" : busy ? "Creating…" : "Create & continue"}</Button>
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/institutions" })}>Cancel</Button>
              </div>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="branch">
          <GlassCard className="p-6 max-w-2xl">
            <SectionHeader title="First branch" />
            <form className="space-y-4" onSubmit={submitBranch}>
              <div className="space-y-1.5"><Label>Branch name *</Label><Input required value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>City</Label><Input value={branch.city} onChange={(e) => setBranch({ ...branch, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" min={1} value={branch.capacity} onChange={(e) => setBranch({ ...branch, capacity: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Address</Label><Input value={branch.address} onChange={(e) => setBranch({ ...branch, address: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add branch & continue"}</Button>
                <Button type="button" variant="ghost" onClick={() => setTab("activation")}>Skip</Button>
              </div>
            </form>
          </GlassCard>
        </TabsContent>

        <TabsContent value="activation">
          <GlassCard className="p-6 max-w-2xl">
            <SectionHeader title="Activation" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "Active" | "Inactive")}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inactive institutions are hidden from operational workflows but remain in records.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={submitActivation} disabled={busy}>{busy ? "Saving…" : "Finish setup"}</Button>
                <Button variant="outline" onClick={() => institution && navigate({ to: "/institutions/$institutionId", params: { institutionId: institution.id } })} disabled={!institution}>Open profile</Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </>
  );
}
