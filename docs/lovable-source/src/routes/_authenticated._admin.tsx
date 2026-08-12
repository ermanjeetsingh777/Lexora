// Pathless RBAC layout — gates child routes to admin role.
// Add `_admin.` to a filename under `_authenticated/` to require admin.
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/store/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, initialized, hasRole } = useAuth();
  const navigate = useNavigate() as (opts: any) => void;

  useEffect(() => {
    if (!initialized) return;
    if (!user || !hasRole("admin")) navigate({ to: "/unauthorized", replace: true });
  }, [initialized, user, hasRole, navigate]);

  if (!initialized || !user || !hasRole("admin")) return null;
  return <Outlet />;
}
