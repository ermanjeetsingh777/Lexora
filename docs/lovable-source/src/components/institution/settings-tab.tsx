import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { institutionDetailQuery, plansQuery } from "@/lib/services";
import { updateInstitution } from "@/lib/org.functions";
import { isDemoInstitutionId, updateMockInstitutionSettings } from "@/lib/institution-demo-service";
import { GlassCard, SectionHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Palette, Mail, Phone, MapPin, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  type: z.string().min(1, "Type is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  address: z.string().max(240).optional().default(""),
  city: z.string().max(80).optional().default(""),
  state: z.string().max(80).optional().default(""),
  country: z.string().max(80).optional().default(""),
  logo_url: z.string().url("Invalid URL").or(z.literal("")).optional().default(""),
  status: z.string().optional().default("Active"),
  subscription_plan: z.string().optional().default(""),
});
type Form = z.infer<typeof schema>;

export function SettingsTab({ institutionId }: { institutionId: string }) {
  const qc = useQueryClient();
  const { data: detail } = useSuspenseQuery(institutionDetailQuery(institutionId));
  const { data: plans } = useQuery(plansQuery());
  const inst = detail.institution;
  const update = useServerFn(updateInstitution);

  const form = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: inst.name ?? "", type: inst.type ?? "",
      email: inst.email ?? "", phone: inst.phone ?? "",
      address: inst.address ?? "", city: inst.city ?? "",
      state: inst.state ?? "", country: inst.country ?? "",
      logo_url: inst.logo_url ?? "", status: inst.status ?? "Active",
      subscription_plan: inst.subscription_plan ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: inst.name ?? "", type: inst.type ?? "",
      email: inst.email ?? "", phone: inst.phone ?? "",
      address: inst.address ?? "", city: inst.city ?? "",
      state: inst.state ?? "", country: inst.country ?? "",
      logo_url: inst.logo_url ?? "", status: inst.status ?? "Active",
      subscription_plan: inst.subscription_plan ?? "",
    });
  }, [inst.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: (vals: Form) =>
      isDemoInstitutionId(institutionId)
        ? Promise.resolve(updateMockInstitutionSettings(institutionId, vals as any))
        : update({ data: { id: institutionId, patch: vals as any } }),
    onMutate: async (vals) => {
      await qc.cancelQueries({ queryKey: ["institution-detail", institutionId] });
      const prev = qc.getQueryData<any>(["institution-detail", institutionId]);
      if (prev) {
        qc.setQueryData(["institution-detail", institutionId], {
          ...prev,
          institution: { ...prev.institution, ...vals, email: vals.email || null, logo_url: vals.logo_url || null },
        });
      }
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["institution-detail", institutionId], ctx.prev);
      toast.error(e?.message ?? "Save failed");
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["institution-detail", institutionId] });
    },
  });

  const logoUrl = form.watch("logo_url");
  const dirty = form.formState.isDirty;
  const submitting = mutation.isPending;

  const onSubmit = (vals: Form) => mutation.mutate(vals);
  const onReset = () => form.reset();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <SectionHeader title="Profile" description="Organization details" actions={<SettingsIcon className="h-4 w-4 text-muted-foreground" />} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="name">Institution name</Label>
              <Input id="name" className="mt-1" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input id="type" className="mt-1" placeholder="Library, Coaching, …" {...form.register("type")} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.watch("status") ?? "Active"} onValueChange={(v) => form.setValue("status", v, { shouldDirty: true })}>
                <SelectTrigger id="status" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Trial">Trial</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email"><Mail className="h-3 w-3 inline mr-1" />Admin email</Label>
              <Input id="email" type="email" className="mt-1" placeholder="admin@example.com" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone"><Phone className="h-3 w-3 inline mr-1" />Support phone</Label>
              <Input id="phone" className="mt-1" placeholder="+91 98765 43210" {...form.register("phone")} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Address" description="Where you operate" actions={<MapPin className="h-4 w-4 text-muted-foreground" />} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="address">Street address</Label>
              <Input id="address" className="mt-1" {...form.register("address")} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" className="mt-1" {...form.register("city")} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" className="mt-1" {...form.register("state")} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" className="mt-1" {...form.register("country")} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Branding" description="Logo & visual identity" actions={<Palette className="h-4 w-4 text-muted-foreground" />} />
          <div className="space-y-3">
            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input id="logo_url" className="mt-1" placeholder="https://…/logo.png" {...form.register("logo_url")} />
              {form.formState.errors.logo_url && <p className="text-xs text-destructive mt-1">{form.formState.errors.logo_url.message}</p>}
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="h-14 w-14 rounded-md border bg-muted/40 overflow-hidden grid place-items-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="h-full w-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Logo preview</p>
                <p className="label-mono">Square PNG / SVG works best.</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Preferences" description="Plan & defaults" />
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="subscription_plan">Subscription plan</Label>
              <Select
                value={form.watch("subscription_plan") || "__none"}
                onValueChange={(v) => form.setValue("subscription_plan", v === "__none" ? "" : v, { shouldDirty: true })}
              >
                <SelectTrigger id="subscription_plan" className="mt-1"><SelectValue placeholder="No plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No plan</SelectItem>
                  {(plans ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={p.name}>{p.name} · ₹{Number(p.price).toLocaleString()}/{p.billing_cycle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Used by the Billing tab to compute MRR and renewal date.</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur p-3">
          <div className="container max-w-screen-xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onReset} disabled={submitting}>Discard</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
