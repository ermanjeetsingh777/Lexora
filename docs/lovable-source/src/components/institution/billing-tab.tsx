import { useState } from "react";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { invoicesQuery, paymentMethodsQuery, subscriptionQuery } from "@/lib/services";
import { setDefaultPaymentMethod, deletePaymentMethod } from "@/lib/billing.functions";
import { deleteMockPaymentMethod, isDemoInstitutionId, setDefaultMockPaymentMethod } from "@/lib/institution-demo-service";
import { GlassCard, SectionHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Plus, CheckCircle2, XCircle, Clock, Download, Receipt, Star, Trash2 } from "lucide-react";
import { InvoiceDetailSheet } from "./invoice-detail-sheet";
import { PaymentMethodDialog } from "./payment-method-dialog";
import { toast } from "sonner";

function fmtCurrency(v: number, currency = "INR") {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(v); }
  catch { return `₹${Math.round(v).toLocaleString()}`; }
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  paid: { variant: "default", icon: CheckCircle2 },
  due: { variant: "secondary", icon: Clock },
  failed: { variant: "destructive", icon: XCircle },
  refunded: { variant: "outline", icon: Receipt },
};

export function BillingTab({ institutionId }: { institutionId: string }) {
  const qc = useQueryClient();
  const { data: invoices } = useSuspenseQuery(invoicesQuery(institutionId));
  const { data: methods } = useSuspenseQuery(paymentMethodsQuery(institutionId));
  const { data: sub } = useSuspenseQuery(subscriptionQuery(institutionId));
  const search = useSearch({ strict: false });
  const navigate = useNavigate() as (opts: any) => void;
  const [addPmOpen, setAddPmOpen] = useState(false);

  const setDefault = useServerFn(setDefaultPaymentMethod);
  const delPm = useServerFn(deletePaymentMethod);

  const setDefaultMut = useMutation({
    mutationFn: (id: string) =>
      isDemoInstitutionId(institutionId)
        ? Promise.resolve(setDefaultMockPaymentMethod(institutionId, id))
        : setDefault({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods", institutionId] }); toast.success("Default payment method updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update default"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      isDemoInstitutionId(institutionId)
        ? Promise.resolve(deleteMockPaymentMethod(institutionId, id))
        : delPm({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods", institutionId] }); toast.success("Payment method removed"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to remove"),
  });

  const openInvoice = (id: string) => navigate({ search: (p: any) => ({ ...p, invoice: id }), replace: false });
  const closeInvoice = () => navigate({ search: (p: any) => ({ ...p, invoice: undefined }), replace: false });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionHeader title="Subscription" description="Current plan & status" actions={<Button size="sm" variant="outline">Change plan</Button>} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="label-mono">Plan</p>
              <div className="mt-1 flex items-center gap-2">
                {sub.plan ? <Badge>{sub.plan.name}</Badge> : <Badge variant="outline">No plan</Badge>}
              </div>
            </div>
            <div>
              <p className="label-mono">MRR</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{fmtCurrency(sub.mrr)}</p>
              {sub.plan && <p className="label-mono">{fmtCurrency(sub.plan.price)} × {sub.activeMembers}</p>}
            </div>
            <div>
              <p className="label-mono">Next renewal</p>
              <p className="mt-1 text-sm">{fmtDate(sub.renewsAt)}</p>
            </div>
            <div>
              <p className="label-mono">Status</p>
              <div className="mt-1"><Badge variant={sub.institutionStatus === "Active" ? "default" : "secondary"}>{sub.institutionStatus}</Badge></div>
            </div>
          </div>
          {sub.plan && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div><p className="label-mono">Billing cycle</p><p className="mt-1 capitalize">{sub.plan.billingCycle}</p></div>
                <div><p className="label-mono">Max members</p><p className="mt-1 tabular-nums">{sub.plan.maxMembers?.toLocaleString() ?? "—"}</p></div>
                <div><p className="label-mono">Max seats</p><p className="mt-1 tabular-nums">{sub.plan.maxSeats?.toLocaleString() ?? "—"}</p></div>
                <div><p className="label-mono">Active members</p><p className="mt-1 tabular-nums">{sub.activeMembers.toLocaleString()}</p></div>
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Payment methods" actions={
            <Button size="sm" variant="outline" onClick={() => setAddPmOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          } />
          {methods.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
              <CreditCard className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium mt-2">No payment method</p>
              <p className="label-mono mt-1">Add one to enable auto-renewal.</p>
              <Button size="sm" className="mt-3" onClick={() => setAddPmOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add method</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((m: any) => (
                <div key={m.id} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-md bg-muted/50 p-2"><CreditCard className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{m.brand} •••• {m.last4}</p>
                      <p className="label-mono">Expires {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)} · {m.holder}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.is_default ? (
                      <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />Default</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDefaultMut.mutate(m.id)} disabled={setDefaultMut.isPending}>
                        Set default
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(m.id)} disabled={deleteMut.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="label-mono mt-3 text-[10px]">Demo capture — only the brand and last 4 digits are stored. No real payment processor is connected.</p>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <SectionHeader title="Invoices" description="Full billing history" />
        {invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-5 w-5" />}
            title="No invoices yet"
            description="Invoices will appear here after your first plan change or renewal."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-y label-mono">
                  <th className="py-2">Invoice</th>
                  <th>Issued</th>
                  <th>Plan</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((iv: any) => {
                  const meta = STATUS_BADGES[iv.status] ?? STATUS_BADGES.due;
                  const Icon = meta.icon;
                  return (
                    <tr key={iv.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => openInvoice(iv.id)}>
                      <td className="py-2.5 font-medium tabular-nums">{iv.number}</td>
                      <td className="text-muted-foreground">{fmtDate(iv.issued_at)}</td>
                      <td className="text-muted-foreground">{iv.plans?.name ?? "—"}</td>
                      <td className="text-right tabular-nums">{fmtCurrency(Number(iv.amount), iv.currency)}</td>
                      <td>
                        <Badge variant={meta.variant} className="gap-1 capitalize">
                          <Icon className="h-3 w-3" />{iv.status}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); openInvoice(iv.id); }}>
                          <Download className="h-3 w-3" />View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <PaymentMethodDialog
        open={addPmOpen}
        onOpenChange={setAddPmOpen}
        institutionId={institutionId}
      />
      <InvoiceDetailSheet
        invoiceId={search.invoice ?? null}
        onClose={closeInvoice}
      />
    </div>
  );
}
