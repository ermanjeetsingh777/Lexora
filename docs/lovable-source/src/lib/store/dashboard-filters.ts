import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const RANGE_OPTIONS = [7, 14, 30, 60, 90] as const;
export type DashboardRange = (typeof RANGE_OPTIONS)[number];
export type DashboardDensity = "compact" | "detailed";

interface DashboardFiltersState {
  range: DashboardRange;
  density: DashboardDensity;
  setRange: (r: DashboardRange) => void;
  setDensity: (d: DashboardDensity) => void;
  reset: () => void;
}

const STORAGE_KEY = "slms-dashboard-filters";

export const useDashboardFilters = create<DashboardFiltersState>()(
  persist(
    (set) => ({
      range: 30,
      density: "detailed",
      setRange: (range) => set({ range }),
      setDensity: (density) => set({ density }),
      reset: () => set({ range: 30, density: "detailed" }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Cross-tab sync — listen for storage events and rehydrate the store
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      const next = parsed?.state;
      if (!next) return;
      const cur = useDashboardFilters.getState();
      if (next.range !== cur.range || next.density !== cur.density) {
        useDashboardFilters.setState({
          range: next.range ?? cur.range,
          density: next.density ?? cur.density,
        });
      }
    } catch {
      /* ignore */
    }
  });
}

/** Clamp shared range to a per-tab supported subset. */
export function useClampedRange(allowed: readonly number[]): number {
  const range = useDashboardFilters((s) => s.range);
  if (allowed.includes(range)) return range;
  // pick the closest allowed value
  return [...allowed].sort((a, b) => Math.abs(a - range) - Math.abs(b - range))[0] ?? allowed[0];
}
