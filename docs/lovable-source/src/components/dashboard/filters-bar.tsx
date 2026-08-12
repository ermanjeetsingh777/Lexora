import type { ReactNode } from "react";
import { useDashboardFilters, RANGE_OPTIONS, type DashboardRange, type DashboardDensity } from "@/lib/store/dashboard-filters";
import { Button } from "@/components/ui/button";
import { CalendarRange, LayoutGrid, Rows3, RotateCcw } from "lucide-react";

/**
 * Persistent, cross-tab dashboard filter bar.
 * Range + density selections sync via localStorage across every dashboard tab
 * and across every open browser tab of this app.
 */
export function DashboardFiltersBar() {
  const range = useDashboardFilters((s) => s.range);
  const density = useDashboardFilters((s) => s.density);
  const setRange = useDashboardFilters((s) => s.setRange);
  const setDensity = useDashboardFilters((s) => s.setDensity);
  const reset = useDashboardFilters((s) => s.reset);

  return (
    <div className="flex flex-wrap items-center gap-2 justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
          <CalendarRange className="h-3.5 w-3.5" /> Range
        </span>
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as DashboardRange)}
              aria-pressed={range === r}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                range === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="View density">
          {([
            { k: "detailed", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Detailed" },
            { k: "compact", icon: <Rows3 className="h-3.5 w-3.5" />, label: "Compact" },
          ] as { k: DashboardDensity; icon: ReactNode; label: string }[]).map((v) => (
            <button
              key={v.k}
              onClick={() => setDensity(v.k)}
              aria-pressed={density === v.k}
              title={v.label}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm transition-colors ${
                density === v.k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.icon}
              <span className="hidden md:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="h-7 px-2 text-xs">
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
      </div>
    </div>
  );
}
