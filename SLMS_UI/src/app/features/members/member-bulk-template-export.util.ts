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
  ['Gender', 'Yes', 'Male, Female, or Other.'],
  ['Shift', 'Yes', 'Morning, Afternoon, Evening, Night, Full, or General.'],
  ['PlanName', 'Yes', 'Must match an active plan name listed below.'],
];

const SAMPLE_ROW = [
  'John Doe',
  'john.doe@example.com',
  '9876543210',
  '2000-01-15',
  'Male',
  'General',
];

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
  autoTable(doc, {
    startY: y + 8,
    head: [['FullName', 'Email', 'PhoneNumber', 'DateOfBirth', 'Gender', 'Shift', 'PlanName']],
    body: [[...SAMPLE_ROW, samplePlanName]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 4 },
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
