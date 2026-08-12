import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { notifications } from "@/lib/mock/data";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/notifications/")({
  head: () => ({ meta: [{ title: "Notifications — SmartLibrary" }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications" description="System alerts, fee reminders and operational events." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-0">
          <ul className="divide-y">
            {notifications.map((n) => (
              <li key={n.id} className="p-4 hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="flex items-center gap-2"><StatusBadge status={n.channel} variant="muted" /><span className="label-mono">{n.timestamp}</span></div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Preferences" />
          <div className="space-y-4 text-sm">
            {["Fee reminders","Late arrivals","Seat changes","Subscription renewals","Branch capacity alerts","Daily digest email"].map((p) => (
              <div key={p} className="flex items-center justify-between border-b pb-3">
                <Label className="text-sm">{p}</Label>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </>
  ),
});
