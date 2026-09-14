import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '@shared/components/button/button.component';
import {
  GlassCardComponent,
  SectionHeaderComponent,
} from '@shared/components/page-header/page-header.component';
import { PaymentAccountMode, SavePaymentAccountRequest } from '@core/models/payment.models';
import { PaymentService } from '@core/services/payment.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';
import { PermissionKey } from '@core/constants/permissions';

/**
 * How this institution collects member fees. The mode is the only switch: moving from a
 * UPI ID to a Razorpay account changes this record, not any payment code.
 */
@Component({
  selector: 'app-payment-settings',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonComponent,
    GlassCardComponent,
    SectionHeaderComponent,
  ],
  templateUrl: './payment-settings.component.html',
})
export class PaymentSettingsComponent {
  readonly institutionId = input.required<string>();

  private readonly payments = inject(PaymentService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly Mode = PaymentAccountMode;
  /** Razorpay radio only when UI + API gateway flag is on. */
  protected readonly gatewayEnabled = this.payments.isPaymentGatewayEnabled();

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly mode = signal<PaymentAccountMode>(PaymentAccountMode.None);
  protected readonly isActive = signal(true);
  protected readonly upiPayeeName = signal('');
  protected readonly upiVpa = signal('');
  protected readonly razorpayKeyId = signal('');
  protected readonly razorpayKeySecret = signal('');
  protected readonly razorpayWebhookSecret = signal('');
  protected readonly hasKeySecret = signal(false);
  protected readonly hasWebhookSecret = signal(false);
  protected readonly webhookUrl = signal<string | null>(null);
  protected readonly isReadyToCollect = signal(false);
  protected readonly firstCapturedAtUtc = signal<string | null>(null);

  /** Test keys collect nothing real, so the screen has to say so while they are typed. */
  protected readonly isTestKey = computed(() =>
    this.razorpayKeyId().trim().toLowerCase().startsWith('rzp_test_'),
  );

  protected readonly canEdit = this.auth.hasPermission(PermissionKey.SettingsUpdate);

  constructor() {
    effect(() => {
      const id = this.institutionId();
      if (id) {
        this.load(id);
      }
    });
  }

  protected load(institutionId = this.institutionId()): void {
    this.loading.set(true);
    this.payments.getAccount(institutionId).subscribe({
      next: (account) => {
        this.mode.set(
          !this.gatewayEnabled && account.mode === PaymentAccountMode.Razorpay
            ? PaymentAccountMode.None
            : account.mode,
        );
        this.isActive.set(account.isActive ?? true);
        this.upiPayeeName.set(account.upiPayeeName ?? '');
        this.upiVpa.set(account.upiVpa ?? '');
        this.razorpayKeyId.set(account.razorpayKeyId ?? '');
        this.razorpayKeySecret.set('');
        this.razorpayWebhookSecret.set('');
        this.hasKeySecret.set(account.hasRazorpayKeySecret);
        this.hasWebhookSecret.set(account.hasRazorpayWebhookSecret);
        this.webhookUrl.set(account.webhookUrl ?? null);
        this.isReadyToCollect.set(account.isReadyToCollect);
        this.firstCapturedAtUtc.set(account.firstCapturedAtUtc ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load payment settings.');
        this.loading.set(false);
      },
    });
  }

  protected save(): void {
    const request: SavePaymentAccountRequest = {
      mode: this.mode(),
      isActive: this.isActive(),
      upiPayeeName: this.upiPayeeName().trim() || null,
      upiVpa: this.upiVpa().trim() || null,
      razorpayKeyId: this.razorpayKeyId().trim() || null,
      // Blank means "keep the stored secret" — the API never sends it back to us.
      razorpayKeySecret: this.razorpayKeySecret().trim() || null,
      razorpayWebhookSecret: this.razorpayWebhookSecret().trim() || null,
    };

    this.saving.set(true);
    this.payments.saveAccount(this.institutionId(), request).subscribe({
      next: (account) => {
        this.saving.set(false);
        this.hasKeySecret.set(account.hasRazorpayKeySecret);
        this.hasWebhookSecret.set(account.hasRazorpayWebhookSecret);
        this.webhookUrl.set(account.webhookUrl ?? null);
        this.isReadyToCollect.set(account.isReadyToCollect);
        this.razorpayKeySecret.set('');
        this.razorpayWebhookSecret.set('');
        this.toast.success('Payment settings saved.');
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.error(error?.error?.message ?? 'Could not save payment settings.');
      },
    });
  }

  protected copyWebhookUrl(): void {
    const url = this.webhookUrl();
    if (!url) {
      return;
    }

    void navigator.clipboard?.writeText(url).then(
      () => this.toast.success('Webhook URL copied.'),
      () => this.toast.error('Could not copy the URL.'),
    );
  }
}
