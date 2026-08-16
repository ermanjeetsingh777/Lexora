import {
  InstitutionBillingInvoice,
  InstitutionDetail,
} from '@core/models/institution-detail.models';
import { InvoiceDocument } from '@core/models/invoice-document.model';

export function formatInvoiceCurrency(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }
}

export function formatInvoiceDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function buildInvoiceDocument(
  invoice: InstitutionBillingInvoice,
  institution?: InstitutionDetail | null,
): InvoiceDocument {
  const plan =
    invoice.planName?.trim() ||
    invoice.description?.replace(/\s+membership payment$/i, '').trim() ||
    'Membership';

  return {
    id: invoice.id,
    number: invoice.number,
    issuedAtUtc: invoice.issuedAtUtc,
    paidAtUtc: invoice.paidAtUtc ?? invoice.issuedAtUtc,
    planStartDate: invoice.planStartDate,
    planEndDate: invoice.planEndDate,
    amount: invoice.amount,
    status: invoice.status,
    currency: 'INR',
    memberName: invoice.memberName,
    planName: plan,
    description: invoice.description,
    institution: institution
      ? {
          name: institution.name,
          address: institution.address,
          city: institution.city,
          state: institution.state,
          country: institution.country,
          email: institution.email,
          phone: institution.phone,
        }
      : undefined,
    lineItems: [
      {
        label: `${plan} membership`,
        qty: 1,
        unit: invoice.amount,
        amount: invoice.amount,
      },
    ],
    notes:
      invoice.status.toLowerCase() === 'paid'
        ? 'Payment received successfully.'
        : 'Invoice awaiting payment.',
  };
}

export function renderInvoiceHtml(invoice: InvoiceDocument): string {
  const items = invoice.lineItems ?? [];
  const currency = invoice.currency ?? 'INR';
  const format = (value: number) => formatInvoiceCurrency(value, currency);
  const institution = invoice.institution;
  const address = [institution?.address, institution?.city, institution?.state, institution?.country]
    .filter(Boolean)
    .join(', ');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${invoice.number}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0f172a; }
    h1 { margin: 0 0 4px; font-size: 20px; }
    .muted { color: #64748b; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .right { text-align: right; }
    .total { font-size: 18px; font-weight: 600; margin-top: 12px; }
    .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>Invoice ${invoice.number}</h1>
  <div class="muted">Issued ${formatInvoiceDate(invoice.issuedAtUtc)}</div>
  <div class="box">
    <div><b>${institution?.name ?? 'Institution'}</b></div>
    ${address ? `<div class="muted">${address}</div>` : ''}
    ${institution?.email ? `<div class="muted">${institution.email}</div>` : ''}
    ${institution?.phone ? `<div class="muted">${institution.phone}</div>` : ''}
  </div>
  ${invoice.memberName ? `<div class="box"><div class="muted">Bill to</div><div><b>${invoice.memberName}</b></div></div>` : ''}
  <div class="box">
    <div><span class="muted">Paid at:</span> ${formatInvoiceDate(invoice.paidAtUtc ?? invoice.issuedAtUtc)}</div>
    <div><span class="muted">Plan start:</span> ${formatInvoiceDate(invoice.planStartDate)}</div>
    <div><span class="muted">Plan end:</span> ${formatInvoiceDate(invoice.planEndDate)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="right">Qty</th>
        <th class="right">Unit</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) =>
            `<tr>
              <td>${item.label}</td>
              <td class="right">${item.qty}</td>
              <td class="right">${format(item.unit)}</td>
              <td class="right">${format(item.amount)}</td>
            </tr>`,
        )
        .join('')}
    </tbody>
  </table>
  <div class="total right">Total: ${format(invoice.amount)}</div>
  <div class="muted right">Status: ${invoice.status}</div>
  ${invoice.notes ? `<div class="box muted">${invoice.notes}</div>` : ''}
</body>
</html>`;
}

export function printInvoice(invoice: InvoiceDocument): void {
  const html = renderInvoiceHtml(invoice);
  const popup = window.open('', '_blank', 'width=800,height=900');
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
}

export function downloadInvoiceHtml(invoice: InvoiceDocument): void {
  const blob = new Blob([renderInvoiceHtml(invoice)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${invoice.number}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadInvoicePdf(invoice: InvoiceDocument): void {
  printInvoice(invoice);
}
