import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { InvoiceDocument } from '@core/models/invoice-document.model';
import { ButtonComponent } from '@shared/components/button/button.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import {
  downloadInvoiceHtml,
  downloadInvoicePdf,
  formatInvoiceCurrency,
  formatInvoiceDate,
  printInvoice,
} from '@shared/utils/invoice-pdf.util';
import { LucideDownload, LucidePrinter, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-invoice-detail-sheet',
  standalone: true,
  imports: [
    CurrencyPipe,
    TitleCasePipe,
    ButtonComponent,
    StatusBadgeComponent,
    LucideX,
    LucidePrinter,
    LucideDownload,
  ],
  templateUrl: './invoice-detail-sheet.component.html',
  styleUrl: './invoice-detail-sheet.component.css',
})
export class InvoiceDetailSheetComponent {
  readonly invoice = input<InvoiceDocument | null>(null);
  readonly closed = output<void>();

  protected readonly formatInvoiceDate = formatInvoiceDate;
  protected readonly formatInvoiceCurrency = formatInvoiceCurrency;

  close(): void {
    this.closed.emit();
  }

  print(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    printInvoice(invoice);
  }

  downloadPdf(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    downloadInvoicePdf(invoice);
  }

  downloadHtml(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    downloadInvoiceHtml(invoice);
  }

  invoiceStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
    const normalized = status.toLowerCase();
    if (normalized === 'paid') return 'success';
    if (normalized === 'due' || normalized === 'pending') return 'warning';
    if (normalized === 'failed') return 'destructive';
    if (normalized === 'refunded') return 'muted';
    return 'default';
  }
}
