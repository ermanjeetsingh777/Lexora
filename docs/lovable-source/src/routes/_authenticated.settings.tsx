import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Settings2, Building2, UserCircle2, ShieldCheck, Palette, Bell,
  SunMoon, KeyRound, History, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsAudit, formatRelative } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsLayout });

const NAV = [
  { to: "/settings", label: "Overview", icon: Settings2, group: "General",
    keywords: ["overview", "summary", "home", "workspace", "tenant"] },
  { to: "/settings/institution", label: "Institution", icon: Building2, group: "General",
    keywords: ["institution", "school", "college", "address", "branding", "license"] },
  { to: "/settings/profile", label: "Profile", icon: UserCircle2, group: "Account",
    keywords: ["profile", "name", "email", "avatar", "language", "timezone"] },
  { to: "/settings/security", label: "Security", icon: ShieldCheck, group: "Account",
    keywords: ["security", "password", "2fa", "two factor", "sessions", "devices", "sso"] },
  { to: "/settings/notifications", label: "Notifications", icon: Bell, group: "Account",
    keywords: ["notifications", "email", "sms", "push", "alerts", "digest"] },
  { to: "/settings/branding", label: "Branding", icon: Palette, group: "Customization",
    keywords: ["branding", "logo", "colors", "favicon", "theme"] },
  { to: "/settings/theme", label: "Theme", icon: SunMoon, group: "Customization",
    keywords: ["theme", "dark", "light", "appearance"] },
  { to: "/settings/api-keys", label: "API keys", icon: KeyRound, group: "Developer",
    keywords: ["api", "keys", "token", "webhook", "developer"] },
  { to: "/settings/audit", label: "Audit log", icon: History, group: "Governance",
    keywords: ["audit", "log", "history", "compliance", "changes"] },
] as const;

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const audit = useSettingsAudit();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return NAV;
    return NAV.filter((n) =>
      n.label.toLowerCase().includes(s) ||
      n.group.toLowerCase().includes(s) ||
      n.keywords.some((k) => k.includes(s))
    );
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof NAV[number][]>();
    filtered.forEach((n) => {
      const arr = map.get(n.group) ?? [];
      arr.push(n);
      map.set(n.group, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const crumb = NAV.find((n) => n.to === pathname)?.label ?? "Settings";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <aside className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <div className="rounded-xl border glass shadow-elegant p-3 space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search settings…"
              className="pl-8 h-9"
            />
          </div>
          <ScrollArea className="max-h-[60vh]">
            <nav className="space-y-3">
              {grouped.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">No matches for “{q}”.</p>
              )}
              {grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="label-mono px-2 mb-1">{group}</p>
                  <div className="space-y-0.5">
                    {items.map((n) => {
                      const Icon = n.icon;
                      const active = pathname === n.to;
                      return (
                        <Link
                          key={n.to}
                          to={n.to as any}
                          className={`flex items-center gap-2 px-2.5 py-2 text-sm rounded-md transition-colors ${
                            active
                              ? "bg-primary/10 text-foreground font-medium ring-1 ring-primary/20"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{n.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2"><History className="h-4 w-4" /> Recent changes</span>
              <Badge variant="secondary">{audit.length}</Badge>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
            <SheetHeader>
              <SheetTitle>Settings audit</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {audit.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              {audit.map((e) => (
                <div key={e.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{e.section}</Badge>
                    <span>{formatRelative(e.ts)}</span>
                  </div>
                  <div className="text-sm mt-1 font-medium">{e.action}</div>
                  {e.detail && <div className="text-xs text-muted-foreground mt-0.5">{e.detail}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">by {e.actor}</div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </aside>
      <div className="space-y-4 min-w-0">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/settings" className="hover:text-foreground">Settings</Link>
          {pathname !== "/settings" && (
            <>
              <span>/</span>
              <span className="text-foreground font-medium">{crumb}</span>
            </>
          )}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
