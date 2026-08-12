import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2 } from "lucide-react";
import { useSettingsAudit, clearSettingsAudit, formatRelative } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings/audit")({
  head: () => ({ meta: [{ title: "Settings audit — SmartLibrary" }] }),
  component: AuditPage,
});

function AuditPage() {
  const entries = useSettingsAudit();
  const [q, setQ] = useState("");
  const [section, setSection] = useState<string>("all");

  const sections = useMemo(() => Array.from(new Set(entries.map((e) => e.section))).sort(), [entries]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (section !== "all" && e.section !== section) return false;
      if (!s) return true;
      return e.action.toLowerCase().includes(s) || e.actor.toLowerCase().includes(s) || (e.detail ?? "").toLowerCase().includes(s);
    });
  }, [entries, q, section]);

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Settings audit log"
        description="Every change made across settings, ordered newest first."
        actions={
          <Button variant="outline" size="sm" onClick={clearSettingsAudit}>
            <Trash2 className="h-4 w-4 mr-1.5" />Clear
          </Button>
        }
      />

      <GlassCard className="p-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, actors, details…" className="pl-8" />
        </div>
        <Select value={section} onValueChange={setSection}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            {sections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} of {entries.length}</Badge>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title="Timeline" />
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No entries match your filters.</p>
        ) : (
          <ol className="relative border-l ml-2 space-y-4">
            {filtered.map((e) => (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{e.section}</Badge>
                  <span>{new Date(e.ts).toLocaleString()}</span>
                  <span>·</span>
                  <span>{formatRelative(e.ts)}</span>
                </div>
                <p className="text-sm font-medium mt-0.5">{e.action}</p>
                {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">by {e.actor}</p>
              </li>
            ))}
          </ol>
        )}
      </GlassCard>
    </>
  );
}
