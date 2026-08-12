import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/page-header";

export function KpiStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GlassCard key={i} className="p-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-2 h-3 w-20" />
        </GlassCard>
      ))}
    </section>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <GlassCard className="p-5">
      <Skeleton className="h-4 w-40 mb-1" />
      <Skeleton className="h-3 w-56 mb-4" />
      <Skeleton className="w-full" style={{ height }} />
    </GlassCard>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <GlassCard className="p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      <div className="space-y-2">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3" />)}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-3 py-2 border-t" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-4" />)}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-1.5 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverviewTabSkeleton() {
  return (
    <div className="space-y-4">
      <KpiStripSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
      </div>
    </div>
  );
}

export function BranchesTabSkeleton() {
  return (
    <div className="space-y-4">
      <KpiStripSkeleton count={4} />
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}

export function LibrariesTabSkeleton() {
  return (
    <div className="space-y-4">
      <KpiStripSkeleton count={4} />
      <GlassCard className="p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <CardGridSkeleton count={6} />
      </GlassCard>
    </div>
  );
}

export function BillingTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </GlassCard>
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}

export function SettingsTabSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <GlassCard key={i} className="p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-3/4" />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
