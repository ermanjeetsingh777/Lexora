import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlanResponse } from '@core/models/institution-dropdown.model';

export interface MemberBulkTemplateContext {
  institutionName: string;
  branchName: string;
  libraryName: string;
}

const COLUMN_INSTRUCTIONS: [string, string, string][] = [
  ['FullName', 'Yes', 'Member full name (2–100 characters).'],
  ['Email', 'No', 'Email address (optional). Used for login and notifications.'],
  ['PhoneNumber', 'Yes', '10-digit Indian mobile number starting with 6–9 (required).'],
  ['DateOfBirth', 'No', 'Date in yyyy-MM-dd format (optional, e.g. 2000-01-15).'],
  ['Gender', 'Yes', 'Dropdown: Male, Female, or Other.'],
  ['Shift', 'Yes', 'Dropdown: Morning, Afternoon, Evening, Night, Full, or General.'],
  ['PlanName', 'Yes', 'Dropdown — must match an active plan name listed below.'],
  ['PlanAmount', 'Auto', 'Auto-filled from selected PlanName (do not edit).'],
  ['PaidAmount', 'No', 'Amount actually paid. Blank = full plan amount.'],
  ['DueAmount', 'No', 'Manual collectible due. Blank = 0. Shortfall without due = Adjustment.'],
  ['AdjustmentAmount', 'Auto', 'Auto: Plan − Paid − Due (discount / waived).'],
  ['MembershipNo', 'No', 'Optional custom Member ID (unique in this library). Blank = auto-generate.'],
  ['PlanStartDate', 'No', 'Optional plan start (yyyy-MM-dd). Default = today.'],
  ['PlanEndDate', 'No', 'Optional plan end (yyyy-MM-dd). Default = start + plan days. Must be after start.'],
];

const SAMPLE_ROW = [
  'John Doe',
  'john.doe@example.com',
  '9876543210',
  '2000-01-15',
  'Male',
  'General',
];

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCurrency(amount: number): string {
  return `Rs. ${(amount ?? 0).toLocaleString('en-IN')}`;
}

export function downloadMemberBulkTemplatePdf(
  ctx: MemberBulkTemplateContext,
  plans: PlanResponse[],
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Member Bulk Upload Template', margin, y);

  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Reference guide — fill the Excel template and upload the .xlsx file.', margin, y);

  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Location', margin, y);

  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Institution: ${ctx.institutionName}`, margin, y);
  y += 14;
  doc.text(`Branch: ${ctx.branchName}`, margin, y);
  y += 14;
  doc.text(`Library: ${ctx.libraryName}`, margin, y);

  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Column instructions', margin, y);

  autoTable(doc, {
    startY: y + 8,
    head: [['Column', 'Required', 'Description']],
    body: COLUMN_INSTRUCTIONS,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    theme: 'grid',
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Sample row (Excel)', margin, y);

  const samplePlanName = plans[0]?.name ?? 'Monthly';
  const samplePrice = plans[0]?.price ?? 0;
  const sampleStart = todayIsoLocal();
  const sampleEnd = addDaysIso(sampleStart, plans[0]?.durationInDays ?? 30);
  autoTable(doc, {
    startY: y + 8,
    head: [[
      'FullName', 'Email', 'Phone', 'DOB', 'Gender', 'Shift',
      'PlanName', 'PlanAmt', 'Paid', 'Due', 'Adj', 'MemberID', 'Start', 'End',
    ]],
    body: [[
      ...SAMPLE_ROW,
      samplePlanName,
      String(samplePrice),
      String(samplePrice),
      '0',
      '0',
      'LIB-00001',
      sampleStart,
      sampleEnd,
    ]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 6.5, cellPadding: 2.5 },
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    theme: 'grid',
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 18;

  if (y > doc.internal.pageSize.getHeight() - 120) {
    doc.addPage();
    y = 48;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Available plans', margin, y);

  const planRows = plans.length
    ? plans.map((p) => [p.name, String(p.durationInDays), formatCurrency(p.price)])
    : [['—', '—', 'No active plans found']];

  autoTable(doc, {
    startY: y + 8,
    head: [['PlanName', 'Duration (days)', 'Price']],
    body: planRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    theme: 'grid',
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 16;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const notes = [
    '• Email must be unique across the system.',
    '• PlanName uses a dropdown; PlanAmount and AdjustmentAmount auto-fill in Excel.',
    '• PaidAmount blank = full plan; DueAmount blank = 0; shortfall without due becomes Adjustment.',
    '• MembershipNo is optional and must be unique within the library; leave blank to auto-generate.',
    '• PlanStartDate / PlanEndDate are optional (yyyy-MM-dd). End defaults to start + plan duration.',
    '• Upload only the filled Excel (.xlsx) file — PDF is for reference only.',
    '• Default member password is applied automatically (same as single add member).',
  ];
  for (const note of notes) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 48;
    }
    doc.text(note, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 14;
  }

  doc.save('member-bulk-upload-template.pdf');
}
