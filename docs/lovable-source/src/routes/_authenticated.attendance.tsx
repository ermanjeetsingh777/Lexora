import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/attendance")({ component: AttLayout });

const tabs = [
  { to: "/attendance", label: "Overview" },
  { to: "/attendance/calendar", label: "Calendar" },
  { to: "/attendance/shifts", label: "Shifts" },
  { to: "/attendance/live", label: "Live" },
  { to: "/attendance/scanner", label: "Scanner" },
];

function AttLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <nav className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to as any} className={`px-3 py-1.5 text-xs font-medium rounded-md ${pathname===t.to?"bg-background shadow-sm":"text-muted-foreground hover:text-foreground"}`}>{t.label}</Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
