import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { type ReactNode } from "react";

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
  className,
  index = 0,
}: {
  label: string;
  value: string | number;
  delta?: number;
  hint?: string;
  icon?: ReactNode;
  className?: string;
  index?: number;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 shadow-elegant hover-lift",
        className
      )}
    >
      <div className="absolute inset-0 blueprint-grid-sm opacity-30 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="label-mono">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {(delta !== undefined || hint) && (
            <div className="flex items-center gap-2 text-xs">
              {delta !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono",
                    positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                </span>
              )}
              {hint && <span className="text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="rounded-lg border bg-muted/40 p-2 text-primary">{icon}</div>
        )}
      </div>
    </motion.div>
  );
}
