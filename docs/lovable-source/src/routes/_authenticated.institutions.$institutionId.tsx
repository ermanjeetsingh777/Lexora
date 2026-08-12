import { Suspense, Component, type ReactNode } from "react";
import { createFileRoute, useParams, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, QueryErrorResetBoundary } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { institutionDetailQuery } from "@/lib/services";
import { OverviewTab } from "@/components/institution/overview-tab";
import { BranchesTab } from "@/components/institution/branches-tab";
import { LibrariesTab } from "@/components/institution/libraries-tab";
import { BillingTab } from "@/components/institution/billing-tab";
import { SettingsTab } from "@/components/institution/settings-tab";
import {
  OverviewTabSkeleton, BranchesTabSkeleton, LibrariesTabSkeleton,
  BillingTabSkeleton, SettingsTabSkeleton,
} from "@/components/institution/tab-skeleton";
import { ErrorState } from "@/components/institution/empty-state";

type DetailSearch = {
  tab?: "overview" | "branches" | "libraries" | "billing" | "settings";
  // branches filters
  q?: string;
  status?: "Active" | "Maintenance" | "Closed";
  cap?: "small" | "mid" | "large";
  // libraries filters
  lq?: string;
  lbranch?: string;
  lfloor?: number;
  lstatus?: "Active" | "Maintenance" | "Closed";
  // billing
  invoice?: string;
};

const TAB_VALUES = new Set(["overview", "branches", "libraries", "billing", "settings"]);

export const Route = createFileRoute("/_authenticated/institutions/$institutionId")({
  head: ({ params }) => ({ meta: [{ title: `Institution — SmartLibrary` }, { name: "x-id", content: params.institutionId }] }),
  validateSearch: (s: Record<string, unknown>): DetailSearch => {
    const out: DetailSearch = {};
    if (typeof s.tab === "string" && TAB_VALUES.has(s.tab)) out.tab = s.tab as any;
    if (typeof s.q === "string" && s.q) out.q = s.q;
    if (s.status === "Active" || s.status === "Maintenance" || s.status === "Closed") out.status = s.status;
    if (s.cap === "small" || s.cap === "mid" || s.cap === "large") out.cap = s.cap;
    if (typeof s.lq === "string" && s.lq) out.lq = s.lq;
    if (typeof s.lbranch === "string" && s.lbranch) out.lbranch = s.lbranch;
    const lf = Number(s.lfloor);
    if (Number.isFinite(lf)) out.lfloor = lf;
    if (s.lstatus === "Active" || s.lstatus === "Maintenance" || s.lstatus === "Closed") out.lstatus = s.lstatus;
    if (typeof s.invoice === "string" && s.invoice) out.invoice = s.invoice;
    return out;
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(institutionDetailQuery(params.institutionId)),
  errorComponent: ({ error }) => (
    <div className="space-y-4">
      <PageHeader title="Institution" description="Failed to load institution details." />
      <ErrorState title="Couldn't load this institution" error={error} />
    </div>
  ),
  notFoundComponent: () => (
    <div className="space-y-4">
      <PageHeader title="Not found" description="That institution doesn't exist or you don't have access." />
    </div>
  ),
  component: InstitutionDetailPage,
});

function InstitutionDetailPage() {
  const { institutionId } = useParams({ from: "/_authenticated/institutions/$institutionId" });
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(institutionDetailQuery(institutionId));
  const inst = data.institution;
  const tab = search.tab ?? "overview";

  return (
    <>
      <PageHeader
        eyebrow={(<Link to="/institutions" className="inline-flex items-center label-mono hover:text-foreground"><ArrowLeft className="h-3 w-3 mr-1" />Institutions</Link>) as any}
        title={inst.name}
        description={`${inst.type ?? ""}${inst.city ? ` · ${inst.city}` : ""}${inst.country ? `, ${inst.country}` : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/institutions/$institutionId", params: { institutionId }, search: (p: any) => ({ ...p, tab: "settings" }), replace: true })}>Settings</Button>
            <Button size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["institution-detail", institutionId] })}>Refresh</Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => navigate({ to: "/institutions/$institutionId", params: { institutionId }, search: (p: any) => ({ ...p, tab: v === "overview" ? undefined : v }), replace: true })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="libraries">Libraries</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TabBoundary fallback={<OverviewTabSkeleton />}>
            <OverviewTab institutionId={institutionId} />
          </TabBoundary>
        </TabsContent>
        <TabsContent value="branches">
          <TabBoundary fallback={<BranchesTabSkeleton />}>
            <BranchesTab institutionId={institutionId} />
          </TabBoundary>
        </TabsContent>
        <TabsContent value="libraries">
          <TabBoundary fallback={<LibrariesTabSkeleton />}>
            <LibrariesTab institutionId={institutionId} />
          </TabBoundary>
        </TabsContent>
        <TabsContent value="billing">
          <TabBoundary fallback={<BillingTabSkeleton />}>
            <BillingTab institutionId={institutionId} />
          </TabBoundary>
        </TabsContent>
        <TabsContent value="settings">
          <TabBoundary fallback={<SettingsTabSkeleton />}>
            <SettingsTab institutionId={institutionId} />
          </TabBoundary>
        </TabsContent>
      </Tabs>
    </>
  );
}

class ResetBoundary extends Component<{ resetKey: number; onReset: () => void; fallback: (err: Error) => ReactNode; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: number }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}

function TabBoundary({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ResetBoundary
          resetKey={0}
          onReset={reset}
          fallback={(err) => <ErrorState error={err} description={err.message} />}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ResetBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
