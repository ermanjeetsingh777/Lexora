import { Component, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiStripSkeleton, ChartSkeleton } from "@/components/institution/tab-skeleton";

/** Generic full-tab skeleton mirroring the shared dashboard layout. */
export function DashboardTabSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-3 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <KpiStripSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartSkeleton height={260} />
        <ChartSkeleton height={260} />
        <ChartSkeleton height={260} />
      </div>
    </div>
  );
}

/** Friendly empty state block for tab bodies. */
export function DashboardEmpty({
  title = "Nothing to show here yet",
  description = "Once data starts flowing in, you'll see it appear here.",
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <GlassCard className="p-10 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <div className="rounded-xl border bg-muted/40 p-3 text-muted-foreground">
          {icon ?? <Inbox className="h-5 w-5" />}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action}
      </div>
    </GlassCard>
  );
}

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <GlassCard className="p-10 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="rounded-xl border bg-destructive/10 p-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">This tab hit a snag</h3>
        <p className="text-sm text-muted-foreground">
          {error?.message || "Something went wrong while rendering this view. It's likely a transient issue."}
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} reset={this.reset} />;
    return this.props.children;
  }
}

/**
 * Wraps a dashboard tab with a route-change skeleton and a resilient
 * error boundary that offers a retry action.
 */
export function DashboardBoundary({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    setShowSkeleton(true);
    const t = setTimeout(() => setShowSkeleton(false), 220);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <ErrorBoundary resetKey={pathname}>
      {showSkeleton ? <DashboardTabSkeleton /> : children}
    </ErrorBoundary>
  );
}
