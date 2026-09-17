import { jsPDF } from 'jspdf';

export interface MemberIdCardContext {
  fullName: string;
  membershipNo: string;
  phone?: string | null;
  email?: string | null;
  photoDataUrl?: string | null;
  /** Library / campus lines shown on the back as address */
  libraryName?: string | null;
  branchName?: string | null;
  institutionName?: string | null;
  libraryAddress?: string | null;
  seatNumber?: string | null;
  planName?: string | null;
  scanUrl: string;
  qrCodeBase64: string;
}

const CARD_W = 243; // ~85.6mm in pt
const CARD_H = 154; // ~54mm in pt

/**
 * Printable member ID card — front (identity) + back (library address + attendance QR).
 * Laid out as two cuttable cards on one A4 page.
 */
export function exportMemberIdCardPdf(ctx: MemberIdCardContext): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  const primary: [number, number, number] = [37, 99, 235];
  const slate900: [number, number, number] = [15, 23, 42];
  const slate600: [number, number, number] = [71, 85, 105];
  const slate400: [number, number, number] = [148, 163, 184];

  const frontX = (pageW - CARD_W) / 2;
  const frontY = 56;
  const backX = frontX;
  const backY = frontY + CARD_H + 36;

  drawFront(doc, frontX, frontY, ctx, primary, slate900, slate600, slate400);
  drawDashedRect(doc, frontX - 2, frontY - 2, CARD_W + 4, CARD_H + 4, slate400);

  doc.setFontSize(8);
  doc.setTextColor(...slate400);
  doc.text('FRONT', frontX, frontY - 8);

  drawBack(doc, backX, backY, ctx, primary, slate900, slate600, slate400);
  drawDashedRect(doc, backX - 2, backY - 2, CARD_W + 4, CARD_H + 4, slate400);

  doc.setFontSize(8);
  doc.setTextColor(...slate400);
  doc.text('BACK', backX, backY - 8);

  const safeName = (ctx.fullName || 'member').replace(/[^\w\-]+/g, '_').slice(0, 40);
  doc.save(`Lexora-ID-${ctx.membershipNo || safeName}.pdf`);
}

function drawFront(
  doc: jsPDF,
  x: number,
  y: number,
  ctx: MemberIdCardContext,
  primary: [number, number, number],
  slate900: [number, number, number],
  slate600: [number, number, number],
  slate400: [number, number, number],
): void {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, CARD_W, CARD_H, 6, 6, 'FD');

  doc.setFillColor(...primary);
  doc.roundedRect(x, y, CARD_W, 28, 6, 6, 'F');
  doc.rect(x, y + 18, CARD_W, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LEXORA', x + 10, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('MEMBER ID', x + CARD_W - 10, y + 18, { align: 'right' });

  const photoSize = 56;
  const photoX = x + 12;
  const photoY = y + 40;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 4, 4, 'FD');

  if (ctx.photoDataUrl) {
    try {
      const format = ctx.photoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(ctx.photoDataUrl, format, photoX + 1, photoY + 1, photoSize - 2, photoSize - 2);
    } catch {
      drawInitials(doc, photoX, photoY, photoSize, ctx.fullName, primary);
    }
  } else {
    drawInitials(doc, photoX, photoY, photoSize, ctx.fullName, primary);
  }

  const textX = photoX + photoSize + 12;
  let ty = y + 48;

  doc.setTextColor(...slate900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const name = doc.splitTextToSize(ctx.fullName || 'Member', CARD_W - photoSize - 36);
  doc.text(name, textX, ty);
  ty += 12 * Math.min(name.length, 2) + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slate600);
  doc.text('Member ID', textX, ty);
  ty += 11;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate900);
  doc.setFontSize(9);
  doc.text(ctx.membershipNo || '—', textX, ty);
  ty += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slate600);
  doc.text('Phone', textX, ty);
  ty += 11;
  doc.setTextColor(...slate900);
  doc.text(ctx.phone || '—', textX, ty);
  ty += 14;

  doc.setTextColor(...slate600);
  doc.text('Email', textX, ty);
  ty += 11;
  doc.setTextColor(...slate900);
  const emailLines = doc.splitTextToSize(ctx.email || '—', CARD_W - photoSize - 36);
  doc.text(emailLines.slice(0, 2), textX, ty);

  doc.setFillColor(245, 158, 11);
  doc.rect(x, y + CARD_H - 4, CARD_W, 4, 'F');
}

function drawBack(
  doc: jsPDF,
  x: number,
  y: number,
  ctx: MemberIdCardContext,
  primary: [number, number, number],
  slate900: [number, number, number],
  slate600: [number, number, number],
  slate400: [number, number, number],
): void {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, CARD_W, CARD_H, 6, 6, 'FD');

  doc.setFillColor(...primary);
  doc.roundedRect(x, y, CARD_W, 22, 6, 6, 'F');
  doc.rect(x, y + 14, CARD_W, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ATTENDANCE PASS', x + 10, y + 14);

  const qrSize = 78;
  const qrX = x + CARD_W - qrSize - 12;
  const qrY = y + 34;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4, 4, 'FD');

  const qrData = normalizeQrDataUrl(ctx.qrCodeBase64);
  try {
    doc.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);
  } catch {
    doc.setFontSize(7);
    doc.setTextColor(...slate400);
    doc.text('QR unavailable', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
  }

  let ty = y + 40;
  const leftW = CARD_W - qrSize - 36;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...slate900);
  doc.text('Library address', x + 12, ty);
  ty += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slate600);

  const addressLines = [
    ctx.libraryName,
    ctx.libraryAddress,
    [ctx.branchName, ctx.institutionName].filter(Boolean).join(' · '),
  ].filter((line): line is string => !!line && line.trim().length > 0);

  if (!addressLines.length) {
    doc.text('—', x + 12, ty);
    ty += 12;
  } else {
    for (const line of addressLines) {
      const wrapped = doc.splitTextToSize(line, leftW);
      doc.text(wrapped.slice(0, 2), x + 12, ty);
      ty += 10 * Math.min(wrapped.length, 2) + 2;
      if (ty > y + 100) break;
    }
  }

  if (ctx.seatNumber) {
    ty = Math.max(ty + 4, y + 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...slate900);
    doc.text(`Seat  ${ctx.seatNumber}`, x + 12, ty);
  }

  if (ctx.planName) {
    ty += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slate400);
    doc.text(`Plan: ${ctx.planName}`, x + 12, Math.min(ty, y + CARD_H - 18));
  }

  doc.setFontSize(6);
  doc.setTextColor(...slate400);
  doc.text('Scan QR to mark attendance', qrX + qrSize / 2, qrY + qrSize + 10, { align: 'center' });
}

function drawInitials(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  fullName: string,
  primary: [number, number, number],
): void {
  doc.setFillColor(...primary);
  doc.roundedRect(x + 1, y + 1, size - 2, size - 2, 3, 3, 'F');
  const initials = (fullName || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(initials || '?', x + size / 2, y + size / 2 + 5, { align: 'center' });
}

function drawDashedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number],
): void {
  doc.setDrawColor(...color);
  doc.setLineDashPattern([3, 2], 0);
  doc.roundedRect(x, y, w, h, 6, 6, 'S');
  doc.setLineDashPattern([], 0);
}

function normalizeQrDataUrl(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  return `data:image/png;base64,${raw}`;
}

/** Convert a blob/object URL or remote image URL to a data URL for jsPDF. */
export async function imageUrlToDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
