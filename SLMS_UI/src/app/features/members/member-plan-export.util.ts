import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MemberPlanResponse } from '@core/models/MemberRequest';

export interface MemberPlanShareContext {
  memberName: string;
  memberEmail: string | null;
  memberPhone: string | null;
  membershipNo: string | null;
  institution: string;
  branch: string;
  library: string;
  shift?: string | null;
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `Rs. ${(amount ?? 0).toLocaleString('en-IN')}`;
}

/** Plain-text labels — no emoji (wa.me prefill often breaks Unicode emoji on Windows/WhatsApp Web). */
function label(key: string, value: string): string {
  return `*${key}:* ${value}`;
}

function planStatusLabel(plan: MemberPlanResponse): string {
  if (!plan.isActive) return 'Inactive';
  return plan.status || plan.paymentStatus || 'Active';
}

function planRows(plans: MemberPlanResponse[]): string[][] {
  return plans.map((p) => [
    formatDisplayDate(p.createdAtUtc),
    p.planName,
    planStatusLabel(p),
    `${formatDisplayDate(p.startDate)} – ${formatDisplayDate(p.endDate)}`,
    formatCurrency(p.price),
    formatCurrency(p.adjustmentAmount ?? 0),
    formatCurrency(p.paidAmount ?? 0),
    formatCurrency(p.dueAmount ?? 0),
    p.paymentStatus ?? '—',
  ]);
}

export function buildMemberPlanShareMessage(
  ctx: MemberPlanShareContext,
  plans: MemberPlanResponse[],
  singlePlan?: MemberPlanResponse,
): string {
  const targetPlans = singlePlan ? [singlePlan] : plans;
  const lines: string[] = [
    '*Payment & Plan Details*',
    '',
    label('Member', ctx.memberName),
    ctx.membershipNo ? label('Membership No', ctx.membershipNo) : '',
    ctx.memberEmail ? label('Email', ctx.memberEmail) : '',
    ctx.memberPhone ? label('Phone', ctx.memberPhone) : '',
    label('Institution', ctx.institution),
    label('Branch', ctx.branch),
    label('Library', ctx.library),
    ctx.shift ? label('Shift', ctx.shift) : '',
    '',
  ].filter(Boolean);

  for (const p of targetPlans) {
    lines.push(
      '--------------------------------',
      singlePlan ? '*Plan Record*' : `*${p.planName}*`,
      label('Date', formatDisplayDate(p.createdAtUtc)),
      label('Plan', p.planName),
      label('Status', planStatusLabel(p)),
      label('Validity', `${formatDisplayDate(p.startDate)} to ${formatDisplayDate(p.endDate)}`),
      label('Amount', formatCurrency(p.price)),
      label('Adjustment', formatCurrency(p.adjustmentAmount ?? 0)),
      label('Paid', formatCurrency(p.paidAmount ?? 0)),
      label('Due', formatCurrency(p.dueAmount ?? 0)),
      p.paymentStatus ? label('Payment', p.paymentStatus) : '',
      '',
    );
  }

  lines.push(`Regards,\n${ctx.library}`);
  return lines.filter(Boolean).join('\n');
}

export function buildMemberPlanEmailSubject(
  ctx: MemberPlanShareContext,
  singlePlan?: MemberPlanResponse,
): string {
  const suffix = singlePlan ? ` – ${singlePlan.planName}` : '';
  return `Payment & Plan Details – ${ctx.memberName}${suffix}`;
}

export function shareMemberPlanEmail(
  ctx: MemberPlanShareContext,
  plans: MemberPlanResponse[],
  singlePlan?: MemberPlanResponse,
): void {
  if (!ctx.memberEmail?.trim()) return;
  const subject = buildMemberPlanEmailSubject(ctx, singlePlan);
  const body = buildMemberPlanShareMessage(ctx, plans, singlePlan);
  const url = `mailto:${encodeURIComponent(ctx.memberEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

export function buildMemberPlanFilename(ctx: MemberPlanShareContext, singlePlan?: MemberPlanResponse): string {
  const slug = ctx.memberName.replace(/[^\w.-]+/g, '-').toLowerCase();
  if (singlePlan) {
    const date = singlePlan.createdAtUtc.slice(0, 10);
    return `payment-plan-${slug}-${date}`;
  }
  return `payment-plans-${slug}`;
}

export function downloadMemberPlansPdf(
  ctx: MemberPlanShareContext,
  plans: MemberPlanResponse[],
  singlePlan?: MemberPlanResponse,
): void {
  const targetPlans = singlePlan ? [singlePlan] : plans;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text('Payment & Plan Details', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 40, 56);
  doc.setTextColor(0);

  const memberLines = [
    [`Member`, ctx.memberName],
    ctx.membershipNo ? [`Membership No`, ctx.membershipNo] : null,
    ctx.memberEmail ? [`Email`, ctx.memberEmail] : null,
    ctx.memberPhone ? [`Phone`, ctx.memberPhone] : null,
    [`Institution`, ctx.institution],
    [`Branch`, ctx.branch],
    [`Library`, ctx.library],
    ctx.shift ? [`Shift`, ctx.shift] : null,
  ].filter((row): row is [string, string] => row !== null);

  autoTable(doc, {
    startY: 68,
    head: [['Field', 'Value']],
    body: memberLines,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 110, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  const tableStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;

  autoTable(doc, {
    startY: tableStartY + 16,
    head: [['Date', 'Plan', 'Status', 'Validity', 'Amount', 'Adjustment', 'Paid', 'Due', 'Payment']],
    body: planRows(targetPlans),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  const totalPaid = targetPlans.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
  const footerY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableStartY + 40;
  doc.setFontSize(11);
  doc.text(`Total paid: ${formatCurrency(totalPaid)}`, pageWidth - 40, footerY + 24, { align: 'right' });

  doc.save(`${buildMemberPlanFilename(ctx, singlePlan)}.pdf`);
}
