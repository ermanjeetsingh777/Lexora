import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "Unauthorized — SmartLibrary" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen grid place-items-center bg-background blueprint-grid px-4">
      <div className="max-w-md rounded-xl border bg-card p-10 text-center shadow-elegant">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <p className="label-mono">Error 403</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role doesn't have permission to access this resource. Contact your administrator.</p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Back to dashboard</Link>
      </div>
    </div>
  ),
});
