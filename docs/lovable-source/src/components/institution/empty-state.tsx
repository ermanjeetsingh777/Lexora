import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";

export function ErrorState({
  title = "Couldn't load this section",
  description,
  error,
}: {
  title?: string;
  description?: string;
  error?: unknown;
}) {
  const router = useRouter();
  const msg = description ?? (error instanceof Error ? error.message : "Please try again.");
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <div className="rounded-xl border bg-destructive/10 p-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{msg}</p>
        <Button size="sm" variant="outline" onClick={() => router.invalidate()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    </div>
  );
}

export function InlineEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-8 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
        {icon && <div className="rounded-lg border bg-background p-2 text-muted-foreground">{icon}</div>}
        <h4 className="text-sm font-semibold">{title}</h4>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
