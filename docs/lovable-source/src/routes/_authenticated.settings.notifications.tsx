import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Bell } from "lucide-react";
import { toast } from "sonner";
import { logSettings } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  head: () => ({ meta: [{ title: "Notifications — SmartLibrary" }] }),
  component: NotificationsPage,
});

type Channel = "email" | "sms" | "push";
type Prefs = Record<string, Record<Channel, boolean>>;

const TOPICS = [
  { id: "borrow", label: "Borrow & return events", desc: "Loans, returns, renewals and overdue alerts." },
  { id: "billing", label: "Billing & invoices", desc: "Payments, failed charges, renewals." },
  { id: "members", label: "Member lifecycle", desc: "Sign-ups, account locks, deletions." },
  { id: "system", label: "System & security", desc: "Outages, key rotations, audit warnings." },
  { id: "digest", label: "Weekly digest", desc: "Summary of activity across your workspace." },
];

const INITIAL: Prefs = TOPICS.reduce((acc, t) => {
  acc[t.id] = { email: true, sms: t.id === "system", push: t.id !== "digest" };
  return acc;
}, {} as Prefs);

function NotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>(INITIAL);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [digestDay, setDigestDay] = useState("Mon");
  const dirty = JSON.stringify(prefs) !== JSON.stringify(INITIAL);

  function toggle(topic: string, ch: Channel) {
    setPrefs((p) => ({ ...p, [topic]: { ...p[topic], [ch]: !p[topic][ch] } }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Notification preferences"
        description="Choose how SmartLibrary reaches you across channels."
      />

      <GlassCard className="p-0 overflow-hidden">
        <div className="grid grid-cols-[1fr_repeat(3,90px)] items-center px-5 py-3 border-b bg-muted/30 text-xs">
          <span className="label-mono">Topic</span>
          <span className="flex items-center gap-1 justify-center label-mono"><Mail className="h-3 w-3" /> Email</span>
          <span className="flex items-center gap-1 justify-center label-mono"><MessageSquare className="h-3 w-3" /> SMS</span>
          <span className="flex items-center gap-1 justify-center label-mono"><Bell className="h-3 w-3" /> Push</span>
        </div>
        <ul className="divide-y">
          {TOPICS.map((t) => (
            <li key={t.id} className="grid grid-cols-[1fr_repeat(3,90px)] items-center px-5 py-3">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              {(["email", "sms", "push"] as Channel[]).map((ch) => (
                <div key={ch} className="flex justify-center">
                  <Switch checked={prefs[t.id][ch]} onCheckedChange={() => toggle(t.id, ch)} />
                </div>
              ))}
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <SectionHeader title="Schedule" description="When notifications should be paused or batched." />
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Quiet hours start</Label><input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="h-9 px-3 rounded-md border bg-background text-sm w-full" /></div>
          <div className="space-y-1.5"><Label>Quiet hours end</Label><input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="h-9 px-3 rounded-md border bg-background text-sm w-full" /></div>
          <div className="space-y-1.5">
            <Label>Digest day</Label>
            <Select value={digestDay} onValueChange={setDigestDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl border bg-background/80 backdrop-blur p-3 shadow-elegant">
        <span className="text-xs text-muted-foreground mr-auto">{dirty ? "Unsaved changes" : "All preferences synced"}</span>
        <Button variant="ghost" size="sm" onClick={() => setPrefs(INITIAL)}>Reset</Button>
        <Button size="sm" onClick={() => { logSettings("Notifications", "Updated notification preferences"); toast.success("Preferences saved"); }}>Save changes</Button>
      </div>
    </>
  );
}
