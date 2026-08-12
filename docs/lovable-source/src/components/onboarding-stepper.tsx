import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "institution", label: "Institution" },
  { key: "branch", label: "Branch" },
  { key: "library", label: "Library" },
] as const;

export function OnboardingStepper({ current }: { current: "institution" | "branch" | "library" }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-3 mb-8">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-mono",
                done && "bg-primary text-primary-foreground border-primary",
                active && "border-primary text-primary",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm", active && "font-semibold", !active && "text-muted-foreground")}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px w-8 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
