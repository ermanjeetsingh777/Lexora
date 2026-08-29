import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface LibraryQrPdfContext {
  libraryName: string;
  institutionName?: string | null;
  branchName?: string | null;
  scanUrl: string;
  qrCodeBase64: string;
  capacity?: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

/**
 * Generates and downloads an elegant Printable A4 PDF Standee / Poster for Library Attendance QR code.
 */
export function exportLibraryQrPdf(ctx: LibraryQrPdfContext): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary Theme Colors
  const primaryColor = [37, 99, 235]; // Royal Blue
  const primaryLight = [239, 246, 255]; // Soft Blue background tint
  const slate900 = [15, 23, 42];
  const slate600 = [71, 85, 105];
  const slate400 = [148, 163, 184];

  // 1. Top Decorative Brand Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Accent Bottom Stripe
  doc.setFillColor(245, 158, 11); // Amber accent
  doc.rect(0, 77, pageWidth, 3, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('LEXORA', 40, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(224, 231, 255);
  doc.text('Smart Library & Attendance Management System', 40, 65);

  doc.setFontSize(10);
  doc.text('PUBLIC ATTENDANCE KIOSK', pageWidth - 40, 48, { align: 'right' });

  // 2. Poster Main Heading & Subtitle
  let currentY = 120;
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Self-Service Attendance QR', pageWidth / 2, currentY, { align: 'center' });

  currentY += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(
    'Scan this QR code with your mobile camera to check in, check out & select seats',
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );

  // 3. Institution / Branch / Library Hierarchy Badge Box
  currentY += 30;
  const badgeBoxWidth = pageWidth - 80;
  const badgeBoxHeight = 54;
  doc.setFillColor(primaryLight[0], primaryLight[1], primaryLight[2]);
  doc.setDrawColor(219, 234, 254);
  doc.roundedRect(40, currentY, badgeBoxWidth, badgeBoxHeight, 10, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(ctx.libraryName, pageWidth / 2, currentY + 24, { align: 'center' });

  const subInfo = [
    ctx.institutionName ? ctx.institutionName : null,
    ctx.branchName ? ctx.branchName : null,
    ctx.capacity ? `Capacity: ${ctx.capacity} Seats` : null,
  ]
    .filter(Boolean)
    .join('  •  ');

  if (subInfo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(subInfo, pageWidth / 2, currentY + 42, { align: 'center' });
  }

  // 4. Center QR Code Presentation Card
  currentY += badgeBoxHeight + 28;
  const cardWidth = 280;
  const cardHeight = 295;
  const cardX = (pageWidth - cardWidth) / 2;

  // Card Background with subtle border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 16, 16, 'FD');

  // Insert QR Code Image
  const qrImageSize = 210;
  const qrX = (pageWidth - qrImageSize) / 2;
  const qrY = currentY + 20;

  try {
    doc.addImage(ctx.qrCodeBase64, 'PNG', qrX, qrY, qrImageSize, qrImageSize);
  } catch (err) {
    console.error('Failed to add QR image to PDF', err);
  }

  // Direct Scan URL caption below QR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('SCAN ME', pageWidth / 2, currentY + cardHeight - 38, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  const displayUrl = ctx.scanUrl.length > 55 ? ctx.scanUrl.substring(0, 52) + '...' : ctx.scanUrl;
  doc.text(displayUrl, pageWidth / 2, currentY + cardHeight - 20, { align: 'center' });

  // 5. Easy 3-Step Instruction Guide Box
  currentY += cardHeight + 24;

  autoTable(doc, {
    startY: currentY,
    head: [['Step 1: Open Camera', 'Step 2: Select Name', 'Step 3: Pick Seat & Confirm']],
    body: [
      [
        'Scan the QR code above or tap attendance scanner on uniappx.in.',
        'Search and select your name from library member list.',
        'Pick your seat and tap Check In / Check Out.',
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 8,
      halign: 'center',
      textColor: [51, 65, 85],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - 80) / 3 },
      1: { cellWidth: (pageWidth - 80) / 3 },
      2: { cellWidth: (pageWidth - 80) / 3 },
    },
    margin: { left: 40, right: 40 },
  });

  // 6. Footer Information
  const footerY = pageHeight - 32;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, footerY - 10, pageWidth - 40, footerY - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text(`Powered by Lexora Smart Library Platform (uniappx.in)`, 40, footerY);

  const timestamp = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated on ${timestamp}`, pageWidth - 40, footerY, { align: 'right' });

  // Safe sanitized file name
  const safeName = ctx.libraryName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  doc.save(`${safeName}_attendance_qr.pdf`);
}
