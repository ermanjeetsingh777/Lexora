import { useQuery } from "@tanstack/react-query";
import { invoiceQuery } from "@/lib/services";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Printer } from "lucide-react";

function fmtCurrency(v: number, currency = "INR") {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(v); }
  catch { return `₹${Math.round(v).toLocaleString()}`; }
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function InvoiceDetailSheet({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const open = !!invoiceId;
  const { data, isLoading, error } = useQuery({
    ...invoiceQuery(invoiceId ?? ""),
    enabled: open,
  });

  const print = () => {
    if (!data) return;
    const html = renderInvoiceHtml(data);
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{data?.number ?? "Invoice"}</SheetTitle>
          <SheetDescription>{data ? `Issued ${fmtDate(data.issued_at)}` : "Loading invoice details…"}</SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">Failed to load invoice.</p>}

        {data && (
          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-lg border p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold tabular-nums">{fmtCurrency(Number(data.amount), data.currency)}</p>
              </div>
              <Badge className="capitalize">{data.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><p className="label-mono">Plan</p><p className="mt-0.5">{data.plans?.name ?? "—"}</p></div>
              <div><p className="label-mono">Billing cycle</p><p className="mt-0.5 capitalize">{data.plans?.billing_cycle ?? "—"}</p></div>
              <div><p className="label-mono">Period start</p><p className="mt-0.5">{fmtDate(data.period_start)}</p></div>
              <div><p className="label-mono">Period end</p><p className="mt-0.5">{fmtDate(data.period_end)}</p></div>
              <div><p className="label-mono">Paid at</p><p className="mt-0.5">{fmtDate(data.paid_at)}</p></div>
              <div><p className="label-mono">Currency</p><p className="mt-0.5">{data.currency}</p></div>
            </div>

            <Separator />

            <div>
              <p className="label-mono mb-2">Line items</p>
              {Array.isArray(data.line_items) && data.line_items.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b label-mono">
                      <th className="py-1">Description</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data.line_items as any[]).map((li, i) => (
                      <tr key={i}>
                        <td className="py-1.5">{li.label}</td>
                        <td className="py-1.5 text-right tabular-nums">{li.qty ?? 1}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmtCurrency(Number(li.unit ?? li.amount), data.currency)}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmtCurrency(Number(li.amount), data.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">No line items recorded.</p>
              )}
            </div>

            {data.notes && (
              <div><p className="label-mono">Notes</p><p className="mt-0.5 text-xs text-muted-foreground">{data.notes}</p></div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={print} size="sm" className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Print / Save PDF</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                const blob = new Blob([renderInvoiceHtml(data)], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${data.number}.html`; a.click();
                URL.revokeObjectURL(url);
              }}><Download className="h-3.5 w-3.5" /> Download</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function renderInvoiceHtml(iv: any): string {
  const items = Array.isArray(iv.line_items) ? iv.line_items : [];
  const total = Number(iv.amount);
  const cur = iv.currency || "INR";
  const fc = (v: number) => `${cur} ${Math.round(v).toLocaleString()}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${iv.number}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;padding:32px;color:#0f172a}
h1{margin:0 0 4px;font-size:20px}.muted{color:#64748b;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}
.right{text-align:right}.total{font-size:18px;font-weight:600;margin-top:12px}
.box{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:12px}</style></head>
<body>
<h1>Invoice ${iv.number}</h1>
<div class="muted">Issued ${iv.issued_at ? new Date(iv.issued_at).toDateString() : ""}</div>
<div class="box">
<div><b>${iv.institutions?.name ?? ""}</b></div>
<div class="muted">${[iv.institutions?.address, iv.institutions?.city, iv.institutions?.state, iv.institutions?.country].filter(Boolean).join(", ")}</div>
${iv.institutions?.email ? `<div class="muted">${iv.institutions.email}</div>` : ""}
</div>
<table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Amount</th></tr></thead>
<tbody>${items.map((li: any) => `<tr><td>${li.label ?? ""}</td><td class="right">${li.qty ?? 1}</td><td class="right">${fc(Number(li.unit ?? li.amount))}</td><td class="right">${fc(Number(li.amount))}</td></tr>`).join("")}</tbody></table>
<div class="total right">Total: ${fc(total)}</div>
<div class="muted right">Status: ${iv.status}</div>
${iv.notes ? `<div class="box muted">${iv.notes}</div>` : ""}
</body></html>`;
}
