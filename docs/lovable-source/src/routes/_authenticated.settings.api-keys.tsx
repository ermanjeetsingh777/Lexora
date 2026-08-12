import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, RotateCw, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { logSettings } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings/api-keys")({
  head: () => ({ meta: [{ title: "API keys — SmartLibrary" }] }),
  component: ApiKeysPage,
});

type Scope = "read" | "write" | "admin";
type ApiKey = { id: string; name: string; preview: string; created: string; lastUsed: string; scope: Scope; env: "live" | "test" };

const INITIAL: ApiKey[] = [
  { id: "k1", name: "Production", preview: "sk_live_••••••••••••2a4f", created: "2025-09-12", lastUsed: "5m ago", scope: "admin", env: "live" },
  { id: "k2", name: "Staging", preview: "sk_test_••••••••••••91bd", created: "2025-09-14", lastUsed: "1d ago", scope: "write", env: "test" },
  { id: "k3", name: "Analytics export", preview: "sk_live_••••••••••••77c0", created: "2025-10-02", lastUsed: "3w ago", scope: "read", env: "live" },
];

function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("read");
  const [env, setEnv] = useState<"live" | "test">("test");

  function create() {
    if (!name.trim()) return toast.error("Name is required");
    const id = `k${Date.now()}`;
    const preview = `sk_${env}_••••••••••••${Math.random().toString(36).slice(2, 6)}`;
    setKeys((k) => [{ id, name: name.trim(), preview, created: new Date().toISOString().slice(0, 10), lastUsed: "—", scope, env }, ...k]);
    logSettings("API keys", `Created key “${name.trim()}”`, `${env} · ${scope}`);
    toast.success("Key created — copy it now, it won't be shown again");
    setOpen(false); setName(""); setScope("read"); setEnv("test");
  }

  function rotate(k: ApiKey) {
    setKeys((arr) => arr.map((x) => x.id === k.id ? { ...x, preview: `sk_${x.env}_••••••••••••${Math.random().toString(36).slice(2,6)}`, created: new Date().toISOString().slice(0,10) } : x));
    logSettings("API keys", `Rotated key “${k.name}”`);
    toast.success("Key rotated");
  }

  function remove(k: ApiKey) {
    setKeys((arr) => arr.filter((x) => x.id !== k.id));
    logSettings("API keys", `Deleted key “${k.name}”`);
    toast.success("Key deleted");
  }

  return (
    <>
      <PageHeader
        eyebrow="Developer"
        title="API keys"
        description="Programmatic access to your tenant. Store keys securely — they grant the scopes you set."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create API key</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Name</Label><Input placeholder="e.g. Reporting service" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Environment</Label>
                    <Select value={env} onValueChange={(v) => setEnv(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="test">Test</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Scope</Label>
                    <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read-only</SelectItem>
                        <SelectItem value="write">Read & write</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create}><KeyRound className="h-4 w-4 mr-2" />Create key</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Total keys", v: keys.length },
          { l: "Live keys", v: keys.filter(k => k.env === "live").length },
          { l: "Admin scope", v: keys.filter(k => k.scope === "admin").length },
          { l: "Used past 24h", v: keys.filter(k => /m|h/.test(k.lastUsed)).length },
        ].map((k) => (
          <GlassCard key={k.l} className="p-4">
            <p className="label-mono">{k.l}</p>
            <p className="text-2xl font-semibold mt-1">{k.v}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <SectionHeader title="Active keys" />
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{k.name}</span>
                    <Badge variant={k.env === "live" ? "default" : "secondary"} className="text-[10px] uppercase">{k.env}</Badge>
                    <Badge variant="outline" className="text-[10px]">{k.scope}</Badge>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground block truncate">{k.preview}</code>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Created {k.created} · Last used {k.lastUsed}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(k.preview); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => rotate(k)}><RotateCw className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(k)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
