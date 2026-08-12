import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/lib/store/theme";
import { Sun, Moon, Monitor } from "lucide-react";
import { logSettings } from "@/lib/settings-audit";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/theme")({
  head: () => ({ meta: [{ title: "Theme — SmartLibrary" }] }),
  component: ThemePage,
});

function ThemePage() {
  const { mode, setMode } = useTheme();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [motion, setMotion] = useState(true);
  const [contrast, setContrast] = useState(false);

  const modes = [
    { id: "light", icon: Sun, label: "Light", desc: "Bright surfaces for daytime." },
    { id: "dark", icon: Moon, label: "Dark", desc: "Reduced glare for evenings." },
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Customization"
        title="Theme"
        description="Personal appearance preferences. These don't affect other members."
      />

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Appearance" />
        <div className="grid sm:grid-cols-2 gap-3">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id as any); logSettings("Theme", `Switched to ${m.label} mode`); }}
                className={`text-left rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${active ? "ring-2 ring-primary border-primary" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg border p-2 ${active ? "bg-primary text-primary-foreground" : "bg-muted/40 text-primary"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <Button variant="outline" disabled className="gap-2"><Monitor className="h-4 w-4" /> Match system (soon)</Button>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <SectionHeader title="Comfort" />
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Compact density</Label>
            <p className="text-xs text-muted-foreground">Tighter padding in tables and lists.</p>
          </div>
          <Switch checked={density === "compact"} onCheckedChange={(v) => { setDensity(v ? "compact" : "comfortable"); logSettings("Theme", `Density: ${v ? "compact" : "comfortable"}`); }} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Reduce motion</Label>
            <p className="text-xs text-muted-foreground">Disable non-essential animations.</p>
          </div>
          <Switch checked={!motion} onCheckedChange={(v) => { setMotion(!v); logSettings("Theme", v ? "Reduced motion enabled" : "Motion restored"); }} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>High contrast</Label>
            <p className="text-xs text-muted-foreground">Stronger borders and text weight.</p>
          </div>
          <Switch checked={contrast} onCheckedChange={(v) => { setContrast(v); logSettings("Theme", v ? "High contrast on" : "High contrast off"); toast.success("Updated"); }} />
        </div>
      </GlassCard>
    </>
  );
}
