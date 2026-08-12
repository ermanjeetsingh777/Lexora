import { create } from "zustand";
import { persist } from "zustand/middleware";

type Mode = "light" | "dark";

interface ThemeState {
  mode: Mode;
  setMode: (m: Mode) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      setMode: (mode) => {
        set({ mode });
        applyMode(mode);
      },
      toggle: () => {
        const next: Mode = get().mode === "dark" ? "light" : "dark";
        set({ mode: next });
        applyMode(next);
      },
    }),
    {
      name: "slms-theme",
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") applyMode(state.mode);
      },
    }
  )
);

function applyMode(mode: Mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}
