import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/seats")({ component: SeatsLayout });

const tabs = [
  { to: "/seats", label: "Overview" },
  { to: "/seats/layout", label: "Floor layout" },
  { to: "/seats/monitoring", label: "Live monitoring" },
  { to: "/seats/heatmap", label: "Heatmap" },
];

function SeatsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <nav className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        {tabs.map((t) => {
          const active = pathname === t.to;
          return (
            <Link key={t.to} to={t.to as any} className={`px-3 py-1.5 text-xs font-medium rounded-md ${active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
