import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logSettings } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings/branding")({
  head: () => ({ meta: [{ title: "Branding — SmartLibrary" }] }),
  component: BrandingPage,
});

const PRESETS = [
  { name: "Meridian", primary: "#6366f1", accent: "#22d3ee" },
  { name: "Ocean", primary: "#0ea5e9", accent: "#14b8a6" },
  { name: "Sunset", primary: "#f97316", accent: "#ef4444" },
  { name: "Forest", primary: "#16a34a", accent: "#84cc16" },
  { name: "Mono", primary: "#0f172a", accent: "#475569" },
];

function BrandingPage() {
  const [logo, setLogo] = useState("");
  const [favicon, setFavicon] = useState("");
  const [primary, setPrimary] = useState("#6366f1");
  const [accent, setAccent] = useState("#22d3ee");
  const [footer, setFooter] = useState("© Meridian Institute · Powered by SmartLibrary");

  function save() {
    if (logo && !/^https?:\/\//.test(logo)) return toast.error("Logo must be a valid URL");
    logSettings("Branding", "Updated branding", `primary ${primary} · accent ${accent}`);
    toast.success("Branding saved");
  }

  return (
    <>
      <PageHeader
        eyebrow="Customization"
        title="Branding"
        description="Logo, palette and footer used across customer-facing pages, receipts and emails."
      />

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Assets" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <Input type="url" placeholder="https://…/logo.svg" value={logo} onChange={(e) => setLogo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Favicon URL</Label>
            <Input type="url" placeholder="https://…/favicon.png" value={favicon} onChange={(e) => setFavicon(e.target.value)} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded border bg-background flex items-center justify-center overflow-hidden">
              {logo ? <img src={logo} alt="" className="object-contain h-full w-full" /> : <span className="text-xs text-muted-foreground">Logo</span>}
            </div>
            <div className="text-xs text-muted-foreground">Shown in the top-left of the app.</div>
          </div>
          <div className="rounded-lg border p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded border bg-background flex items-center justify-center overflow-hidden">
              {favicon ? <img src={favicon} alt="" className="object-contain h-full w-full" /> : <span className="text-[10px] text-muted-foreground">ico</span>}
            </div>
            <div className="text-xs text-muted-foreground">Shown in browser tabs and bookmarks.</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Color palette" description="Pick a preset or fine-tune two key tokens." />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => { setPrimary(p.primary); setAccent(p.accent); }}
              className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted/60 ${primary === p.primary ? "ring-2 ring-primary" : ""}`}
            >
              <span className="h-4 w-4 rounded-full border" style={{ background: p.primary }} />
              <span className="h-4 w-4 rounded-full border" style={{ background: p.accent }} />
              <span className="font-medium">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Primary</Label>
            <div className="flex gap-2">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-12 rounded-md border bg-background" />
              <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Accent</Label>
            <div className="flex gap-2">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 rounded-md border bg-background" />
              <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          <p className="text-xs uppercase tracking-wide text-white/80">Preview</p>
          <p className="text-xl font-semibold text-white mt-1">Welcome to Meridian Library</p>
          <p className="text-sm text-white/90">Your brand applied to receipts, emails and member portals.</p>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Footer" />
        <Textarea rows={2} value={footer} onChange={(e) => setFooter(e.target.value)} />
      </GlassCard>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl border bg-background/80 backdrop-blur p-3 shadow-elegant">
        <Button variant="ghost" size="sm" onClick={() => { setLogo(""); setFavicon(""); setPrimary("#6366f1"); setAccent("#22d3ee"); }}>Reset</Button>
        <Button size="sm" onClick={save}>Save branding</Button>
      </div>
    </>
  );
}
