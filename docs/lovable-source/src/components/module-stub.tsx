import { PageHeader, EmptyState, GlassCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function ModuleStub({
  eyebrow, title, description, children,
}: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Button size="sm">New</Button>}
      />
      {children ?? (
        <GlassCard className="p-0 overflow-hidden">
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Module preview"
            description="This screen wires into the shared design system, navigation and mock data. Detailed flows are scheduled for the next iteration."
            action={<Button variant="outline" size="sm">View documentation</Button>}
          />
        </GlassCard>
      )}
    </>
  );
}
