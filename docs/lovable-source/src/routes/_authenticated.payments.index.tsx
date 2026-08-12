import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { AreaTrend, Donut } from "@/components/charts";
import { payments } from "@/lib/mock/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  Search, Download, MoreHorizontal, RefreshCcw, Receipt, Copy,
  ArrowDownUp, FileText, X, TrendingDown, Printer, CalendarIcon,
  ChevronDown, AlertTriangle, ScrollText,
} from "lucide-react";
import { toast } from "sonner";

type Payment = (typeof payments)[number];
type SortKey = "date" | "amount" | "memberName" | "status";
type SortDir = "asc" | "desc";

type RefundEvent = {
  id: string;
  ts: string;
  stage: "Requested" | "Processing" | "Completed";
  amount: number;
  reason: string;
};
type AuditEntry = {
  id: string;
  ts: string;
  actor: "You" | "System";
  action: "Refund" | "Retry" | "Copy ID" | "Download receipt" | "Print receipt" | "View";
  note?: string;
};

const STATUSES = ["Paid", "Pending", "Failed", "Refunded"] as const;
const METHODS = ["Card", "UPI", "Bank", "Cash"] as const;
const REFUND_REASONS = ["Duplicate", "Requested by customer", "Fraudulent", "Other"] as const;

const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const nowIso = () => new Date().toISOString();
const relTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const Route = createFileRoute("/_authenticated/payments/")({
  head: () => ({ meta: [{ title: "Payments — SmartLibrary" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>(payments);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");
  const [range, setRange] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [bulkRefundOpen, setBulkRefundOpen] = useState(false);
  const [audit, setAudit] = useState<Record<string, AuditEntry[]>>({});
  const [refunds, setRefunds] = useState<Record<string, RefundEvent[]>>({});
  const [settleFrom, setSettleFrom] = useState<Date | undefined>();
  const [settleTo, setSettleTo] = useState<Date | undefined>();
  const pageSize = 8;

  const logAudit = (id: string, action: AuditEntry["action"], note?: string) => {
    setAudit((m) => ({
      ...m,
      [id]: [
        { id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ts: nowIso(), actor: "You", action, note },
        ...(m[id] ?? []),
      ],
    }));
  };

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const today = new Date("2025-05-28");
    const dayMs = 86400000;
    const cutoff: Record<string, number> = { "7": 7, "30": 30, "90": 90 };
    return rows
      .filter((p) => {
        if (status !== "all" && p.status !== status) return false;
        if (method !== "all" && p.method !== method) return false;
        if (range !== "all") {
          const d = new Date(p.date).getTime();
          if (today.getTime() - d > cutoff[range] * dayMs) return false;
        }
        if (!ql) return true;
        return (
          p.invoiceId.toLowerCase().includes(ql) ||
          p.memberName.toLowerCase().includes(ql) ||
          p.method.toLowerCase().includes(ql)
        );
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const av = a[sortKey]; const bv = b[sortKey];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
  }, [rows, q, status, method, range, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const volume = filtered.reduce((s, p) => s + (p.status !== "Refunded" ? p.amount : 0), 0);
  const refundedAmt = filtered.filter((p) => p.status === "Refunded").reduce((s, p) => s + p.amount, 0);
  const successRate = filtered.length
    ? Math.round((filtered.filter((p) => p.status === "Paid").length / filtered.length) * 100)
    : 0;
  const failed = filtered.filter((p) => p.status === "Failed").length;

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((p) => {
      if (p.status === "Paid") map.set(p.date, (map.get(p.date) ?? 0) + p.amount);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [filtered]);

  const methodMix = useMemo(() => {
    const palette: Record<string, string> = {
      Card: "oklch(0.62 0.20 258)",
      UPI: "oklch(0.68 0.18 160)",
      Bank: "oklch(0.70 0.16 70)",
      Cash: "oklch(0.62 0.16 20)",
    };
    return METHODS.map((m) => ({
      name: m,
      value: filtered.filter((p) => p.method === m).length,
      color: palette[m],
    })).filter((d) => d.value > 0);
  }, [filtered]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectPage = () => {
    const ids = pageRows.map((r) => r.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const exportCsv = (data: Payment[], filename = `payments-${Date.now()}.csv`) => {
    const head = ["Invoice", "Member", "Method", "Date", "Status", "Amount"];
    const body = data.map((p) => [p.invoiceId, p.memberName, p.method, p.date, p.status, p.amount].join(","));
    const blob = new Blob([head.join(",") + "\n" + body.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} transactions`);
  };

  const applyRefund = (p: Payment, amount: number, reason: string) => {
    const previousStatus = p.status;
    setRows((arr) => arr.map((r) => r.id === p.id ? { ...r, status: "Refunded" } : r));
    const baseId = `rf_${Date.now()}`;
    const requested: RefundEvent = { id: `${baseId}_req`, ts: nowIso(), stage: "Requested", amount, reason };
    setRefunds((m) => ({ ...m, [p.id]: [...(m[p.id] ?? []), requested] }));
    logAudit(p.id, "Refund", `${fmtINR(amount)} • ${reason}`);

    setTimeout(() => {
      setRefunds((m) => ({
        ...m,
        [p.id]: [...(m[p.id] ?? []), { id: `${baseId}_proc`, ts: nowIso(), stage: "Processing", amount, reason }],
      }));
    }, 600);
    setTimeout(() => {
      setRefunds((m) => ({
        ...m,
        [p.id]: [...(m[p.id] ?? []), { id: `${baseId}_done`, ts: nowIso(), stage: "Completed", amount, reason }],
      }));
    }, 1500);

    const partial = amount < p.amount;
    toast.success(`${partial ? "Partial refund" : "Refund"} of ${fmtINR(amount)} issued for ${p.invoiceId}`, {
      action: {
        label: "Undo",
        onClick: () => {
          setRows((arr) => arr.map((r) => r.id === p.id ? { ...r, status: previousStatus } : r));
          setRefunds((m) => { const c = { ...m }; delete c[p.id]; return c; });
        },
      },
    });
  };

  const retry = (p: Payment) => {
    setRows((arr) => arr.map((r) => r.id === p.id ? { ...r, status: "Paid" } : r));
    logAudit(p.id, "Retry");
    toast.success(`Retried ${p.invoiceId} — payment captured`);
  };

  const buildReceiptHtml = (p: Payment) => `<!doctype html>
<html><head><meta charset="utf-8"><title>Receipt ${p.invoiceId}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#111;margin:0;padding:32px;}
  .wrap{max-width:520px;margin:0 auto;}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px;}
  .brand{font-weight:700;font-size:20px;letter-spacing:-0.01em;}
  .muted{color:#666;font-size:12px;}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #ddd;font-size:14px;}
  .row span:last-child{font-variant-numeric:tabular-nums;}
  .total{display:flex;justify-content:space-between;padding:16px 0;margin-top:8px;border-top:2px solid #111;font-weight:700;font-size:18px;}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;background:#eef2ff;color:#3730a3;}
  .foot{margin-top:32px;font-size:11px;color:#888;text-align:center;}
  @page{size:A5;margin:14mm;}
  @media print{.no-print{display:none;}}
</style></head><body><div class="wrap">
  <div class="head">
    <div><div class="brand">SmartLibrary</div><div class="muted">Payment receipt</div></div>
    <div style="text-align:right"><div class="muted">${p.invoiceId}</div><div class="muted">${p.date}</div></div>
  </div>
  <div class="row"><span>Billed to</span><span>${p.memberName}</span></div>
  <div class="row"><span>Payment method</span><span>${p.method}</span></div>
  <div class="row"><span>Status</span><span class="badge">${p.status}</span></div>
  <div class="row"><span>Invoice date</span><span>${p.date}</span></div>
  <div class="total"><span>Amount ${p.status === "Refunded" ? "refunded" : "paid"}</span><span>${fmtINR(p.amount)}</span></div>
  <div class="foot">This is a system-generated receipt. Thank you for your payment.</div>
</div></body></html>`;

  const downloadReceipt = (p: Payment) => {
    const blob = new Blob([buildReceiptHtml(p)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `receipt-${p.invoiceId}.html`; a.click();
    URL.revokeObjectURL(url);
    logAudit(p.id, "Download receipt");
    toast.success(`Receipt ${p.invoiceId} downloaded`);
  };

  const printReceipt = (p: Payment) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0"; iframe.style.bottom = "0";
    iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open(); doc.write(buildReceiptHtml(p)); doc.close();
    iframe.contentWindow!.focus();
    setTimeout(() => {
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 200);
    logAudit(p.id, "Print receipt");
  };

  const openDetail = (p: Payment) => {
    setDetail(p);
    logAudit(p.id, "View");
  };

  const copyInvoice = (p: Payment) => {
    navigator.clipboard.writeText(p.invoiceId);
    logAudit(p.id, "Copy ID");
    toast.success("Invoice ID copied");
  };

  const resetFilters = () => { setQ(""); setStatus("all"); setMethod("all"); setRange("all"); setPage(1); };
  const activeFilterCount = [status !== "all", method !== "all", range !== "all", q !== ""].filter(Boolean).length;

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedRefundable = selectedRows.filter((r) => r.status === "Paid");

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        description="All transactions across institutions."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
              <Download className="h-4 w-4 mr-2" />Export CSV
            </Button>
            <Button size="sm">
              <Receipt className="h-4 w-4 mr-2" />New invoice
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Net volume" value={fmtINR(volume - refundedAmt)} delta={3.2} />
        <KpiCard label="Success rate" value={`${successRate}%`} delta={successRate >= 80 ? 1.4 : -2.1} />
        <KpiCard label="Failed" value={failed} delta={failed > 0 ? -0.8 : 0} />
        <KpiCard label="Refunded" value={fmtINR(refundedAmt)} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionHeader title="Revenue trend" description="Captured payments over time" />
          {trend.length ? (
            <AreaTrend
              data={trend}
              keys={[{ key: "amount", label: "Captured", color: "oklch(0.62 0.20 258)" }]}
              height={220}
            />
          ) : (
            <EmptyChart />
          )}
        </GlassCard>
        <GlassCard className="p-5">
          <SectionHeader title="Method mix" />
          {methodMix.length ? <Donut data={methodMix} /> : <EmptyChart />}
        </GlassCard>
      </section>

      <ReconciliationPanel
        rows={rows}
        from={settleFrom}
        to={settleTo}
        onFrom={setSettleFrom}
        onTo={setSettleTo}
        onExport={(data) => exportCsv(data, `reconciliation-${Date.now()}.csv`)}
      />

      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2">
            <SectionHeader title="Transactions" description={`${filtered.length} of ${rows.length}`} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice, member…"
                className="pl-8 w-64"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={(v) => { setRange(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />Clear
                <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
              </Button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
            <span>
              {selected.size} selected
              {selectedRefundable.length > 0 && (
                <span className="text-muted-foreground"> · {selectedRefundable.length} refundable</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => exportCsv(selectedRows)}
              ><Download className="h-4 w-4 mr-1.5" />Export</Button>
              <Button
                variant="destructive" size="sm"
                disabled={selectedRefundable.length === 0}
                onClick={() => setBulkRefundOpen(true)}
              ><RefreshCcw className="h-4 w-4 mr-1.5" />Refund selected</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-y label-mono">
                <th className="py-2 w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    className="accent-primary"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleSelectPage}
                  />
                </th>
                <th className="py-2">Invoice</th>
                <Th onClick={() => toggleSort("memberName")} active={sortKey === "memberName"} dir={sortDir}>Member</Th>
                <th>Method</th>
                <Th onClick={() => toggleSort("date")} active={sortKey === "date"} dir={sortDir}>Date</Th>
                <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>Status</Th>
                <Th onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir} className="text-right">Amount</Th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageRows.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No transactions match your filters.
                </td></tr>
              )}
              {pageRows.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => openDetail(p)}
                >
                  <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.invoiceId}`}
                      className="accent-primary"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>
                  <td className="py-2.5 font-mono text-xs">{p.invoiceId}</td>
                  <td>{p.memberName}</td>
                  <td className="text-muted-foreground">{p.method}</td>
                  <td>{p.date}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-right tabular-nums font-medium">
                    {p.status === "Refunded" ? <span className="text-muted-foreground">−{fmtINR(p.amount)}</span> : fmtINR(p.amount)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        title="Download receipt"
                        onClick={() => downloadReceipt(p)}
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="font-mono text-xs">{p.invoiceId}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDetail(p)}>
                            <FileText className="h-4 w-4 mr-2" />View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyInvoice(p)}>
                            <Copy className="h-4 w-4 mr-2" />Copy invoice ID
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadReceipt(p)}>
                            <Download className="h-4 w-4 mr-2" />Download receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printReceipt(p)}>
                            <Printer className="h-4 w-4 mr-2" />Print receipt
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.status === "Failed" && (
                            <DropdownMenuItem onClick={() => retry(p)}>
                              <RefreshCcw className="h-4 w-4 mr-2" />Retry charge
                            </DropdownMenuItem>
                          )}
                          {p.status === "Paid" && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setRefundTarget(p)}>
                              <RefreshCcw className="h-4 w-4 mr-2" />Issue refund
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <PaginationItem key={n}>
                  <PaginationLink
                    href="#"
                    isActive={n === page}
                    onClick={(e) => { e.preventDefault(); setPage(n); }}
                  >{n}</PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </GlassCard>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />{detail.invoiceId}
                </SheetTitle>
                <SheetDescription>Transaction details and timeline</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="rounded-lg border border-border/60 p-4">
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="text-3xl font-semibold tabular-nums mt-1">{fmtINR(detail.amount)}</div>
                  <div className="mt-2"><StatusBadge status={detail.status} /></div>
                </div>
                <Field label="Member" value={detail.memberName} />
                <Field label="Method" value={detail.method} />
                <Field label="Date" value={detail.date} />
                <Field label="Invoice ID" value={detail.invoiceId} mono />

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadReceipt(detail)}>
                    <Download className="h-4 w-4 mr-1.5" />Receipt
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => printReceipt(detail)}>
                    <Printer className="h-4 w-4 mr-1.5" />Print
                  </Button>
                </div>

                <div>
                  <div className="label-mono mb-2">Timeline</div>
                  <ol className="space-y-3 text-sm">
                    <TimelineItem ts={detail.date} title="Invoice issued" />
                    <TimelineItem ts={detail.date} title={`Payment attempt via ${detail.method}`} />
                    {detail.status === "Paid" && <TimelineItem ts={detail.date} title="Captured" tone="success" />}
                    {detail.status === "Failed" && <TimelineItem ts={detail.date} title="Declined by issuer" tone="error" />}
                    {detail.status === "Pending" && <TimelineItem ts={detail.date} title="Awaiting confirmation" tone="warn" />}
                  </ol>
                </div>

                {(refunds[detail.id]?.length ?? 0) > 0 && (
                  <div>
                    <div className="label-mono mb-2">Refund status</div>
                    <ol className="space-y-3 text-sm">
                      {refunds[detail.id].map((e) => (
                        <TimelineItem
                          key={e.id}
                          ts={`${new Date(e.ts).toLocaleTimeString()} · ${fmtINR(e.amount)} · ${e.reason}`}
                          title={e.stage}
                          tone={e.stage === "Completed" ? "success" : "warn"}
                        />
                      ))}
                    </ol>
                  </div>
                )}

                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between label-mono py-1">
                    <span className="flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" />Audit log</span>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <AuditList entries={audit[detail.id] ?? []} onClear={() =>
                      setAudit((m) => { const c = { ...m }; delete c[detail.id]; return c; })
                    } />
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex gap-2 pt-2">
                  {detail.status === "Paid" && (
                    <Button variant="destructive" className="flex-1" onClick={() => { setRefundTarget(detail); }}>
                      Issue refund
                    </Button>
                  )}
                  {detail.status === "Failed" && (
                    <Button className="flex-1" onClick={() => { retry(detail); setDetail(null); }}>
                      <RefreshCcw className="h-4 w-4 mr-2" />Retry
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <RefundDialog
        target={refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={(amount, reason) => {
          if (refundTarget) applyRefund(refundTarget, amount, reason);
          setRefundTarget(null);
        }}
      />

      <BulkRefundDialog
        open={bulkRefundOpen}
        onOpenChange={setBulkRefundOpen}
        selected={selectedRows}
        onConfirm={(reason) => {
          selectedRefundable.forEach((p) => applyRefund(p, p.amount, reason));
          setBulkRefundOpen(false);
          setSelected(new Set());
          toast.success(`Refunded ${selectedRefundable.length} transactions`);
        }}
      />
    </>
  );
}

function RefundDialog({
  target, onClose, onConfirm,
}: { target: Payment | null; onClose: () => void; onConfirm: (amount: number, reason: string) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>(REFUND_REASONS[1]);
  const [note, setNote] = useState("");

  // Reset when target changes
  useMemo(() => {
    if (target) { setStep(1); setAmount(String(target.amount)); setReason(REFUND_REASONS[1]); setNote(""); }
  }, [target?.id]);

  if (!target) return null;
  const amt = Number(amount) || 0;
  const valid = amt > 0 && amt <= target.amount;
  const finalReason = reason === "Other" ? (note.trim() || "Other") : reason;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue refund · {target.invoiceId}</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Specify the amount and reason." : "Review and confirm. This action cannot be undone after the processing window."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="label-mono mb-1.5 block">Amount</label>
              <Input
                type="number" min={1} max={target.amount} step={1}
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Original {fmtINR(target.amount)}</span>
                <button className="hover:text-foreground" onClick={() => setAmount(String(target.amount))}>Use full amount</button>
              </div>
              {!valid && amount !== "" && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Amount must be between ₹1 and {fmtINR(target.amount)}.
                </p>
              )}
            </div>
            <div>
              <label className="label-mono mb-1.5 block">Reason</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {reason === "Other" && (
                <Textarea
                  placeholder="Add a note…" className="mt-2"
                  value={note} onChange={(e) => setNote(e.target.value)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 p-4 space-y-2 text-sm">
            <Field label="Member" value={target.memberName} />
            <Field label="Method" value={target.method} />
            <Field label="Reason" value={finalReason} />
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-muted-foreground">Refund amount</span>
              <span className="text-lg font-semibold tabular-nums">{fmtINR(amt)}</span>
            </div>
            {amt < target.amount && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Partial refund — {fmtINR(target.amount - amt)} remains charged.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button disabled={!valid} onClick={() => setStep(2)}>Continue</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button variant="destructive" onClick={() => onConfirm(amt, finalReason)}>
                Confirm refund
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkRefundDialog({
  open, onOpenChange, selected, onConfirm,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  selected: Payment[]; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState<string>(REFUND_REASONS[1]);
  const refundable = selected.filter((p) => p.status === "Paid");
  const skipped = selected.filter((p) => p.status !== "Paid");
  const total = refundable.reduce((s, p) => s + p.amount, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Refund {refundable.length} transaction{refundable.length === 1 ? "" : "s"}</AlertDialogTitle>
          <AlertDialogDescription>
            This will issue refunds for every selected transaction with a refundable status. Non-refundable rows are skipped.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border/60 p-3">
              <div className="label-mono">Refundable</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{refundable.length}</div>
              <div className="text-xs text-muted-foreground">{fmtINR(total)}</div>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <div className="label-mono">Skipped</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{skipped.length}</div>
              <div className="text-xs text-muted-foreground">Not in Paid status</div>
            </div>
          </div>

          {skipped.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />Skipping non-refundable
              </div>
              <ul className="mt-1 font-mono text-[11px] text-muted-foreground space-y-0.5 max-h-20 overflow-auto">
                {skipped.map((p) => <li key={p.id}>{p.invoiceId} · {p.status}</li>)}
              </ul>
            </div>
          )}

          <div>
            <label className="label-mono mb-1.5 block">Reason (applied to all)</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.filter((r) => r !== "Other").map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {refundable.length === 0 && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />No refundable transactions in selection.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={refundable.length === 0}
            onClick={() => onConfirm(reason)}
          >
            Refund {refundable.length} · {fmtINR(total)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReconciliationPanel({
  rows, from, to, onFrom, onTo, onExport,
}: {
  rows: Payment[];
  from: Date | undefined; to: Date | undefined;
  onFrom: (d: Date | undefined) => void; onTo: (d: Date | undefined) => void;
  onExport: (data: Payment[]) => void;
}) {
  const today = new Date("2025-05-28");
  const dayMs = 86400000;

  const scoped = rows.filter((p) => {
    const t = new Date(p.date).getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime() + dayMs - 1) return false;
    return true;
  });

  const isSettled = (p: Payment) =>
    p.status === "Paid" && today.getTime() - new Date(p.date).getTime() > 2 * dayMs;
  const isPending = (p: Payment) =>
    (p.status === "Paid" && today.getTime() - new Date(p.date).getTime() <= 2 * dayMs) || p.status === "Pending";

  const settled = scoped.filter(isSettled);
  const pending = scoped.filter(isPending);
  const refundedRows = scoped.filter((p) => p.status === "Refunded");

  const settledSum = settled.reduce((s, p) => s + p.amount, 0);
  const pendingSum = pending.reduce((s, p) => s + p.amount, 0);
  const refundSum = refundedRows.reduce((s, p) => s + p.amount, 0);
  const netPayout = settledSum - refundSum;

  const grouped = useMemo(() => {
    const map = new Map<string, { date: string; count: number; gross: number; refunds: number }>();
    scoped.forEach((p) => {
      const row = map.get(p.date) ?? { date: p.date, count: 0, gross: 0, refunds: 0 };
      row.count += 1;
      if (p.status === "Refunded") row.refunds += p.amount;
      else if (p.status === "Paid") row.gross += p.amount;
      map.set(p.date, row);
    });
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [scoped]);

  const reset = () => { onFrom(undefined); onTo(undefined); };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <SectionHeader title="Reconciliation" description="Settlement vs pending payouts" />
        <div className="flex flex-wrap items-center gap-2">
          <DatePopover label="From" value={from} onChange={onFrom} />
          <DatePopover label="To" value={to} onChange={onTo} />
          {(from || to) && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-4 w-4 mr-1" />Reset
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onExport(scoped)}>
            <Download className="h-4 w-4 mr-1.5" />Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <ReconTile label="Settled" amount={settledSum} count={settled.length} tone="success" />
        <ReconTile label="Pending payout" amount={pendingSum} count={pending.length} tone="warn" />
        <ReconTile label="Net payout" amount={netPayout} count={settled.length - refundedRows.length} tone="default" hint={`${fmtINR(refundSum)} refunded`} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-y label-mono">
              <th className="py-2">Date</th>
              <th>Txns</th>
              <th className="text-right">Gross</th>
              <th className="text-right">Refunds</th>
              <th className="text-right">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grouped.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                No settlements in selected range.
              </td></tr>
            )}
            {grouped.map((g) => (
              <tr key={g.date} className="hover:bg-muted/40">
                <td className="py-2">{g.date}</td>
                <td>{g.count}</td>
                <td className="text-right tabular-nums">{fmtINR(g.gross)}</td>
                <td className="text-right tabular-nums text-muted-foreground">
                  {g.refunds ? `−${fmtINR(g.refunds)}` : "—"}
                </td>
                <td className="text-right tabular-nums font-medium">{fmtINR(g.gross - g.refunds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function ReconTile({
  label, amount, count, tone, hint,
}: { label: string; amount: number; count: number; tone: "success" | "warn" | "default"; hint?: string }) {
  const dot = tone === "success" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between">
        <span className="label-mono flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}
        </span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{fmtINR(amount)}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function DatePopover({
  label, value, onChange,
}: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4 mr-1.5" />
          {value ? format(value, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

function AuditList({ entries, onClear }: { entries: AuditEntry[]; onClear: () => void }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No activity yet for this transaction.</p>;
  }
  return (
    <div className="space-y-2">
      <ol className="space-y-2 max-h-48 overflow-auto pr-1">
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{e.action}</span>
                <span className="text-xs text-muted-foreground" title={new Date(e.ts).toLocaleString()}>
                  {relTime(e.ts)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {e.actor}{e.note ? ` · ${e.note}` : ""}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Clear log
      </button>
    </div>
  );
}

function Th({
  children, onClick, active, dir, className,
}: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: SortDir; className?: string }) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""}`}
      >
        {children}
        {onClick && <ArrowDownUp className={`h-3 w-3 ${active ? "opacity-100" : "opacity-30"}`} />}
        {active && dir && <span className="sr-only">{dir}</span>}
      </button>
    </th>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}

function TimelineItem({ ts, title, tone }: { ts: string; title: string; tone?: "success" | "error" | "warn" }) {
  const color = tone === "success" ? "bg-emerald-500"
    : tone === "error" ? "bg-destructive"
    : tone === "warn" ? "bg-amber-500"
    : "bg-muted-foreground/40";
  return (
    <li className="flex gap-3">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${color}`} />
      <div className="flex-1">
        <div>{title}</div>
        <div className="text-xs text-muted-foreground">{ts}</div>
      </div>
    </li>
  );
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
      <TrendingDown className="h-4 w-4 mr-2" />No data for current filters
    </div>
  );
}
