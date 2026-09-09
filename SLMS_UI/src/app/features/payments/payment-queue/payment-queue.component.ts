import { Component, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  GlassCardComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import {
  PAYMENT_STATUS_LABELS,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PaymentTransaction,
} from '@core/models/payment.models';
import { PaymentService } from '@core/services/payment.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { PermissionKey } from '@core/constants/permissions';

/**
 * Member fee payments for one institution, newest first. UPI transfers wait here until
 * someone confirms the UTR; gateway payments land already captured via the webhook.
 */
@Component({
  selector: 'app-payment-queue',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ButtonComponent, GlassCardComponent, SectionHeaderComponent],
  templateUrl: './payment-queue.component.html',
})
export class PaymentQueueComponent {
  readonly institutionId = input.required<string>();
  readonly memberId = input<string | null>(null);
  /** Bump this to reload after a payment is collected elsewhere on the page. */
  readonly reloadToken = input<number>(0);

  private readonly payments = inject(PaymentService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly Status = PaymentStatus;
  protected readonly Provider = PaymentProvider;
  protected readonly statusLabels = PAYMENT_STATUS_LABELS;

  protected readonly loading = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly transactions = signal<PaymentTransaction[]>([]);

  protected readonly canVerify = this.auth.hasPermission(PermissionKey.PaymentsUpdate);

  constructor() {
    effect(() => {
      const institutionId = this.institutionId();
      this.reloadToken();

      if (institutionId) {
        this.load();
      }
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.payments
      .list({
        institutionId: this.institutionId(),
        memberId: this.memberId() ?? undefined,
        purpose: PaymentPurpose.MemberFee,
        take: 50,
      })
      .subscribe({
        next: (transactions) => {
          this.transactions.set(transactions);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('Could not load payments.');
          this.loading.set(false);
        },
      });
  }

  protected approve(transaction: PaymentTransaction): void {
    this.busyId.set(transaction.id);
    this.payments.approve(transaction.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`Payment ${transaction.reference} confirmed.`);
        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(error?.error?.message ?? 'Could not confirm this payment.');
      },
    });
  }

  protected reject(transaction: PaymentTransaction): void {
    const reason = window.prompt(`Why is ${transaction.reference} being rejected?`)?.trim();
    if (!reason) {
      return;
    }

    this.busyId.set(transaction.id);
    this.payments.reject(transaction.id, reason).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('Payment rejected.');
        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(error?.error?.message ?? 'Could not reject this payment.');
      },
    });
  }

  protected statusClass(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.Captured:
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case PaymentStatus.AwaitingVerification:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case PaymentStatus.Failed:
      case PaymentStatus.Cancelled:
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }
}
