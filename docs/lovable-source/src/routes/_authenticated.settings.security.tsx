import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Smartphone, Monitor, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { logSettings } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({ meta: [{ title: "Security — SmartLibrary" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const [twoFA, setTwoFA] = useState(false);
  const [requireSSO, setRequireSSO] = useState(true);
  const [rotateDays, setRotateDays] = useState("90");
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [sessions] = useState([
    { id: "s1", device: "MacBook Pro · Chrome", location: "Bengaluru, IN", current: true, lastActive: "Active now" },
    { id: "s2", device: "iPhone 15 · Safari", location: "Bengaluru, IN", current: false, lastActive: "2h ago" },
    { id: "s3", device: "Windows · Edge", location: "Delhi, IN", current: false, lastActive: "Yesterday" },
  ]);

  function changePwd() {
    if (!pwd.current || !pwd.next) return toast.error("Fill in both password fields");
    if (pwd.next.length < 10) return toast.error("Use at least 10 characters");
    if (pwd.next !== pwd.confirm) return toast.error("Passwords don't match");
    setPwd({ current: "", next: "", confirm: "" });
    logSettings("Security", "Changed password");
    toast.success("Password updated");
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Security"
        description="Sign-in, multi-factor authentication and active sessions."
        actions={twoFA
          ? <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Hardened</Badge>
          : <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> Action needed</Badge>}
      />

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Multi-factor authentication" />
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Authenticator app (TOTP)</p>
              <p className="text-xs text-muted-foreground">Use Google Authenticator, 1Password, etc.</p>
            </div>
          </div>
          <Switch checked={twoFA} onCheckedChange={(v) => {
            setTwoFA(v);
            logSettings("Security", v ? "Enabled 2FA" : "Disabled 2FA");
            toast.success(v ? "2FA enabled" : "2FA disabled");
          }} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Require SSO for admins</p>
            <p className="text-xs text-muted-foreground">Admin accounts must sign in via your IdP.</p>
          </div>
          <Switch checked={requireSSO} onCheckedChange={(v) => { setRequireSSO(v); logSettings("Security", v ? "Required SSO for admins" : "Disabled SSO requirement"); }} />
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Password" />
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl">
          <div className="space-y-1.5"><Label>Current</Label><Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>New</Label><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Confirm</Label><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Force rotation every</p>
            <p className="text-xs text-muted-foreground">Applies to all members of your workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" min={0} className="w-24" value={rotateDays} onChange={(e) => setRotateDays(e.target.value)} />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={changePwd}><KeyRound className="h-4 w-4 mr-2" />Update password</Button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionHeader title="Active sessions" description="Sign out of devices you no longer use." />
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">{s.device}{s.current && <Badge variant="secondary" className="text-[10px]">This device</Badge>}</p>
                  <p className="text-xs text-muted-foreground">{s.location} · {s.lastActive}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={s.current} onClick={() => { logSettings("Security", `Signed out ${s.device}`); toast.success("Session revoked"); }}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" />Revoke
              </Button>
            </li>
          ))}
        </ul>
      </GlassCard>
    </>
  );
}
