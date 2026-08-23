import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PackageSubscriptionHistoryItem } from '@core/models/package-subscription.models';

export interface SubscriptionInvoiceContext {
  accountName: string;
  accountEmail: string;
  institutionName?: string | null;
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `Rs. ${(amount ?? 0).toLocaleString('en-IN')}`;
}

function statusLabel(status: string): string {
  if (status === 'ExpiringSoon') return 'Expiring soon';
  if (status === 'Expired') return 'Expired';
  return 'Active';
}

function invoiceNumber(item: PackageSubscriptionHistoryItem): string {
  const date = item.createdAtUtc.slice(0, 10).replace(/-/g, '');
  const idPart = item.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `SUB-${date}-${idPart}`;
}

function historyTableHead(isSuperAdmin: boolean): string[] {
  const head = ['Date', 'Plan', 'Action', 'Period', 'Status', 'Package', 'Adjustment', 'Paid'];
  if (isSuperAdmin) return ['User', 'Institution', ...head];
  return head;
}

function historyTableRow(item: PackageSubscriptionHistoryItem, isSuperAdmin: boolean): string[] {
  const row = [
    formatDisplayDate(item.createdAtUtc),
    item.packageName,
    item.action,
    `${formatDisplayDate(item.startDateUtc)} – ${formatDisplayDate(item.endDateUtc)}`,
    statusLabel(item.status),
    formatCurrency(item.packagePrice),
    formatCurrency(item.adjustmentAmount),
    formatCurrency(item.amountPaid),
  ];
  if (isSuperAdmin) return [item.userName, item.institutionName ?? '—', ...row];
  return row;
}

function buildFilename(prefix: string, item?: PackageSubscriptionHistoryItem): string {
  const slug = prefix.replace(/[^\w.-]+/g, '-').toLowerCase();
  if (item) {
    return `${slug}-${item.createdAtUtc.slice(0, 10)}`;
  }
  return `${slug}-${new Date().toISOString().slice(0, 10)}`;
}

function addAccountBlock(doc: jsPDF, ctx: SubscriptionInvoiceContext, startY: number): number {
  const lines = [
    [`Account`, ctx.accountName],
    [`Email`, ctx.accountEmail],
    ctx.institutionName ? [`Institution`, ctx.institutionName] : null,
  ].filter((row): row is [string, string] => row !== null);

  autoTable(doc, {
    startY,
    head: [['Field', 'Value']],
    body: lines,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 110, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 40;
}

export function downloadSubscriptionHistoryPdf(
  ctx: SubscriptionInvoiceContext,
  history: PackageSubscriptionHistoryItem[],
  isSuperAdmin = false,
): void {
  if (!history.length) return;

  const doc = new jsPDF({ orientation: isSuperAdmin ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text('Institution Subscription History', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 40, 56);
  doc.setTextColor(0);

  const afterAccountY = addAccountBlock(doc, ctx, 68);

  autoTable(doc, {
    startY: afterAccountY + 16,
    head: [historyTableHead(isSuperAdmin)],
    body: history.map((item) => historyTableRow(item, isSuperAdmin)),
    styles: { fontSize: isSuperAdmin ? 7 : 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  const totalPaid = history.reduce((sum, item) => sum + (item.amountPaid ?? 0), 0);
  const footerY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? afterAccountY + 40;
  doc.setFontSize(11);
  doc.text(`Total paid: ${formatCurrency(totalPaid)}`, pageWidth - 40, footerY + 24, { align: 'right' });

  doc.save(`${buildFilename('subscription-history', undefined)}.pdf`);
}

export function downloadSubscriptionInvoicePdf(
  ctx: SubscriptionInvoiceContext,
  item: PackageSubscriptionHistoryItem,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const invNo = invoiceNumber(item);

  doc.setFontSize(18);
  doc.text('Subscription Invoice', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Invoice ${invNo}`, 40, 56);
  doc.text(`Issued ${formatDisplayDate(item.createdAtUtc)}`, 40, 70);
  doc.setTextColor(0);

  const billTo = [
    [`Name`, item.userName || ctx.accountName],
    [`Email`, item.userEmail || ctx.accountEmail],
    item.institutionName ? [`Institution`, item.institutionName] : null,
  ].filter((row): row is [string, string] => row !== null);

  autoTable(doc, {
    startY: 88,
    head: [['Bill to', '']],
    body: billTo,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 110, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  const detailsStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140;

  autoTable(doc, {
    startY: detailsStartY + 16,
    head: [['Description', 'Value']],
    body: [
      ['Plan', item.packageName],
      ['Action', item.action],
      ['Status', statusLabel(item.status)],
      ['Period', `${formatDisplayDate(item.startDateUtc)} to ${formatDisplayDate(item.endDateUtc)}`],
      ['Duration', `${item.durationInDays} days`],
      ['Payment status', item.paymentStatus || '—'],
      ['Package amount', formatCurrency(item.packagePrice)],
      ['Adjustment (remaining days credit)', formatCurrency(item.adjustmentAmount)],
      ['Amount paid', formatCurrency(item.amountPaid)],
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: { 0: { cellWidth: 180, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  const footerY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? detailsStartY + 80;
  doc.setFontSize(12);
  doc.text(`Total paid: ${formatCurrency(item.amountPaid)}`, pageWidth - 40, footerY + 28, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('SmartLibrary — Institution SaaS Subscription', 40, footerY + 48);
  doc.setTextColor(0);

  doc.save(`${buildFilename('subscription-invoice', item)}.pdf`);
}
