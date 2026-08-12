import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { DashboardBoundary } from "@/components/dashboard/state-boundary";
import { DashboardFiltersBar } from "@/components/dashboard/filters-bar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const tabs: { to: string; label: string }[] = [
  { to: "/dashboard", label: "Overview" },
  { to: "/dashboard/analytics", label: "Analytics" },
  { to: "/dashboard/occupancy", label: "Occupancy" },
  { to: "/dashboard/revenue", label: "Revenue" },
  { to: "/dashboard/attendance", label: "Attendance" },
  { to: "/dashboard/subscriptions", label: "Subscriptions" },
  { to: "/dashboard/notifications", label: "Notifications" },
  { to: "/dashboard/activity", label: "Activity" },
];

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto -mx-1 px-1">
        <nav className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {tabs.map((t) => {
            const active = pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to as any}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <DashboardFiltersBar />
      <DashboardBoundary>
        <Outlet />
      </DashboardBoundary>
    </div>
  );
}
