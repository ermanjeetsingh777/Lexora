import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  PaymentAccountMode,
  PaymentInstruction,
  PaymentStatus,
} from '@core/models/payment.models';
import { PaymentService } from '@core/services/payment.service';
import { ToastService } from '@core/services/toast.service';

type DialogStep = 'amount' | 'upi' | 'done';

/**
 * Collects one member fee payment. The API decides whether this is a gateway checkout
 * or a UPI transfer; this dialog only renders what it is told, so an institution can
 * switch modes without any change here.
 */
@Component({
  selector: 'app-collect-payment-dialog',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, ButtonComponent],
  templateUrl: './collect-payment-dialog.component.html',
})
export class CollectPaymentDialogComponent {
  readonly memberId = input.required<string>();
  readonly memberName = input<string>('');
  readonly dueAmount = input<number>(0);
  readonly memberPlanId = input<string | null>(null);

  /** Emitted once money is confirmed or a UPI reference is submitted for review. */
  readonly completed = output<void>();
  readonly closed = output<void>();

  private readonly payments = inject(PaymentService);
  private readonly toast = inject(ToastService);

  protected readonly Mode = PaymentAccountMode;

  protected readonly step = signal<DialogStep>('amount');
  protected readonly busy = signal(false);
  protected readonly amount = signal<number | null>(null);
  protected readonly instruction = signal<PaymentInstruction | null>(null);
  protected readonly utr = signal('');
  protected readonly doneMessage = signal('');

  protected close(): void {
    this.closed.emit();
  }

  protected start(): void {
    const amount = this.amount() ?? this.dueAmount();
    if (!amount || amount <= 0) {
      this.toast.error('Enter an amount greater than zero.');
      return;
    }

    this.busy.set(true);
    this.payments
      .initiateMemberFee(this.memberId(), { amount, memberPlanId: this.memberPlanId() })
      .subscribe({
        next: (instruction) => {
          this.instruction.set(instruction);

          if (instruction.mode === PaymentAccountMode.Razorpay) {
            void this.runCheckout(instruction);
            return;
          }

          this.busy.set(false);
          this.step.set('upi');
        },
        error: (error) => {
          this.busy.set(false);
          this.toast.error(error?.error?.message ?? 'Could not start the payment.');
        },
      });
  }

  private async runCheckout(instruction: PaymentInstruction): Promise<void> {
    try {
      const result = await this.payments.openRazorpayCheckout(instruction);

      if (!result) {
        this.busy.set(false);
        this.toast.info('Payment window closed.');
        return;
      }

      this.payments.verifyRazorpay(result).subscribe({
        next: (transaction) => {
          this.busy.set(false);
          this.doneMessage.set(
            transaction.status === PaymentStatus.Captured
              ? 'Payment received and dues updated.'
              : 'Payment recorded. It will be confirmed shortly.',
          );
          this.step.set('done');
          this.completed.emit();
        },
        error: (error) => {
          this.busy.set(false);
          // The webhook still reconciles this, so do not tell the payer it failed outright.
          this.toast.error(
            error?.error?.message ?? 'We could not confirm the payment yet. It will update automatically.',
          );
        },
      });
    } catch (error) {
      this.busy.set(false);
      this.toast.error(error instanceof Error ? error.message : 'Could not open the payment window.');
    }
  }

  protected submitUtr(): void {
    const instruction = this.instruction();
    const reference = this.utr().trim();

    if (!instruction) {
      return;
    }

    if (!reference) {
      this.toast.error('Enter the 12-digit UPI reference / UTR from your payment app.');
      return;
    }

    this.busy.set(true);
    this.payments.submitUpiReference(instruction.transactionId, reference).subscribe({
      next: () => {
        this.busy.set(false);
        this.doneMessage.set('Reference submitted. The library will confirm it and clear the dues.');
        this.step.set('done');
        this.completed.emit();
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(error?.error?.message ?? 'Could not submit the reference.');
      },
    });
  }

  protected copyUpiId(): void {
    const vpa = this.instruction()?.upi?.vpa;
    if (!vpa) {
      return;
    }

    void navigator.clipboard?.writeText(vpa).then(
      () => this.toast.success('UPI ID copied.'),
      () => this.toast.error('Could not copy the UPI ID.'),
    );
  }
}
