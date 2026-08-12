import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, GlassCard } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Building2, UserCircle2, ShieldCheck, Palette, Bell, SunMoon, KeyRound, History,
  CheckCircle2, AlertTriangle, ArrowUpRight,
} from "lucide-react";
import { useSettingsAudit, formatRelative } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings/")({
  head: () => ({ meta: [{ title: "Settings — SmartLibrary" }] }),
  component: SettingsHome,
});

const TILES = [
  { to: "/settings/institution", icon: Building2, title: "Institution",
    description: "Workspace name, address, license tier.", status: "Configured" as const },
  { to: "/settings/profile", icon: UserCircle2, title: "Profile",
    description: "Personal account info and preferences.", status: "Complete" as const },
  { to: "/settings/security", icon: ShieldCheck, title: "Security",
    description: "Password, 2FA, sessions and SSO.", status: "Attention" as const, badge: "Enable 2FA" },
  { to: "/settings/notifications", icon: Bell, title: "Notifications",
    description: "Email, SMS and in-app channels.", status: "Configured" as const },
  { to: "/settings/branding", icon: Palette, title: "Branding",
    description: "Logo, colors and tenant identity.", status: "Configured" as const },
  { to: "/settings/theme", icon: SunMoon, title: "Theme",
    description: "Personal appearance preferences.", status: "Complete" as const },
  { to: "/settings/api-keys", icon: KeyRound, title: "API keys",
    description: "Programmatic access tokens.", status: "Configured" as const },
  { to: "/settings/audit", icon: History, title: "Audit log",
    description: "Every change made across settings.", status: "Live" as const },
];

const STATUS: Record<string, { tone: string; icon: any }> = {
  Configured: { tone: "text-emerald-500", icon: CheckCircle2 },
  Complete: { tone: "text-emerald-500", icon: CheckCircle2 },
  Attention: { tone: "text-amber-500", icon: AlertTriangle },
  Live: { tone: "text-primary", icon: History },
};

function SettingsHome() {
  const audit = useSettingsAudit();
  const todayCount = audit.filter((e) => Date.now() - e.ts < 1000 * 60 * 60 * 24).length;
  const sectionsConfigured = TILES.filter((t) => t.status !== "Attention").length;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Tenant configuration, account preferences and developer controls — all in one place."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sections", value: TILES.length },
          { label: "Configured", value: `${sectionsConfigured}/${TILES.length}` },
          { label: "Changes (24h)", value: todayCount },
          { label: "Open warnings", value: TILES.filter((t) => t.status === "Attention").length },
        ].map((k) => (
          <GlassCard key={k.label} className="p-4">
            <p className="label-mono">{k.label}</p>
            <p className="text-2xl font-semibold tracking-tight mt-1">{k.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {TILES.map((t) => {
          const Icon = t.icon;
          const S = STATUS[t.status];
          const SIcon = S.icon;
          return (
            <Link key={t.to} to={t.to as any} className="group">
              <GlassCard className="p-5 h-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg border bg-muted/40 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{t.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <SIcon className={`h-3.5 w-3.5 ${S.tone}`} />
                  <span className={S.tone}>{t.status}</span>
                  {t.badge && <Badge variant="outline" className="ml-auto text-[10px]">{t.badge}</Badge>}
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Recent settings activity</h2>
            <p className="text-xs text-muted-foreground">Last few changes across your workspace.</p>
          </div>
          <Link to="/settings/audit" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        <ul className="divide-y">
          {audit.slice(0, 5).map((e) => (
            <li key={e.id} className="py-2.5 flex items-start gap-3">
              <Badge variant="outline" className="text-[10px] mt-0.5">{e.section}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{e.action}</p>
                <p className="text-xs text-muted-foreground">{e.actor} · {formatRelative(e.ts)}</p>
              </div>
            </li>
          ))}
          {audit.length === 0 && <li className="py-6 text-sm text-muted-foreground text-center">Nothing yet.</li>}
        </ul>
      </GlassCard>
    </>
  );
}
