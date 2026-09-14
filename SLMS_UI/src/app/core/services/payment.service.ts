import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  InitiateMemberFeePaymentRequest,
  PaymentAccount,
  PaymentInstruction,
  PaymentTransaction,
  PaymentTransactionQuery,
  PlatformPaymentStatus,
  SavePaymentAccountRequest,
  VerifyRazorpayPaymentRequest,
} from '@core/models/payment.models';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayCheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(ApiService);
  private checkoutScript?: Promise<void>;

  /** UI build flag — must be true and API PaymentGateway:Enabled for Razorpay. */
  isPaymentGatewayEnabled(): boolean {
    return environment.paymentGatewayEnabled === true;
  }

  getPlatformStatus(): Observable<PlatformPaymentStatus> {
    return this.api
      .get<PlatformPaymentStatus>('payments/platform/status')
      .pipe(
        map((r) => {
          const status = r.data!;
          return {
            ...status,
            enabled: this.isPaymentGatewayEnabled() && !!status.enabled,
          };
        }),
      );
  }

  getAccount(institutionId: string): Observable<PaymentAccount> {
    return this.api
      .get<PaymentAccount>(`payments/institutions/${institutionId}/account`)
      .pipe(map((r) => r.data!));
  }

  saveAccount(institutionId: string, request: SavePaymentAccountRequest): Observable<PaymentAccount> {
    return this.api
      .putTo<PaymentAccount>(`payments/institutions/${institutionId}/account`, request)
      .pipe(map((r) => r.data!));
  }

  initiateMemberFee(memberId: string, request: InitiateMemberFeePaymentRequest): Observable<PaymentInstruction> {
    return this.api
      .post<PaymentInstruction>(`payments/member-fees/${memberId}/initiate`, request)
      .pipe(map((r) => r.data!));
  }

  initiateSubscription(userPackageId?: string): Observable<PaymentInstruction> {
    return this.api
      .post<PaymentInstruction>('payments/subscription/initiate', { userPackageId: userPackageId ?? null })
      .pipe(map((r) => r.data!));
  }

  initiateAddon(userPackageAddonId: string): Observable<PaymentInstruction> {
    return this.api
      .post<PaymentInstruction>(`payments/addons/${userPackageAddonId}/initiate`, {})
      .pipe(map((r) => r.data!));
  }

  submitUpiReference(transactionId: string, utr: string, note?: string): Observable<PaymentTransaction> {
    return this.api
      .post<PaymentTransaction>(`payments/${transactionId}/upi-reference`, { utr, note: note ?? null })
      .pipe(map((r) => r.data!));
  }

  approve(transactionId: string): Observable<PaymentTransaction> {
    return this.api
      .post<PaymentTransaction>(`payments/${transactionId}/approve`, {})
      .pipe(map((r) => r.data!));
  }

  reject(transactionId: string, reason: string): Observable<PaymentTransaction> {
    return this.api
      .post<PaymentTransaction>(`payments/${transactionId}/reject`, { reason })
      .pipe(map((r) => r.data!));
  }

  verifyRazorpay(request: VerifyRazorpayPaymentRequest): Observable<PaymentTransaction> {
    return this.api
      .post<PaymentTransaction>('payments/razorpay/verify', request)
      .pipe(map((r) => r.data!));
  }

  list(query: PaymentTransactionQuery = {}): Observable<PaymentTransaction[]> {
    return this.api
      .get<PaymentTransaction[]>('payments', { params: query as Record<string, unknown> })
      .pipe(map((r) => r.data ?? []));
  }

  /**
   * Opens the Razorpay checkout dialog and resolves with the payload it hands back.
   * Resolves `null` when the payer closes the dialog without paying.
   */
  async openRazorpayCheckout(instruction: PaymentInstruction): Promise<VerifyRazorpayPaymentRequest | null> {
    if (!this.isPaymentGatewayEnabled()) {
      throw new Error('Online payment gateway is not enabled. Please use the offline payment option.');
    }

    const config = instruction.razorpay;
    if (!config) {
      throw new Error('This payment is not a gateway payment.');
    }

    await this.loadCheckoutScript();

    const razorpay = (window as unknown as { Razorpay?: new (options: unknown) => { open: () => void } }).Razorpay;
    if (!razorpay) {
      throw new Error('Payment window could not be loaded. Check your connection and try again.');
    }

    return new Promise<VerifyRazorpayPaymentRequest | null>((resolve, reject) => {
      const checkout = new razorpay({
        key: config.keyId,
        order_id: config.orderId,
        amount: config.amountInPaise,
        currency: instruction.currency,
        name: config.displayName,
        description: instruction.note ?? undefined,
        prefill: {
          name: config.prefillName ?? undefined,
          email: config.prefillEmail ?? undefined,
          contact: config.prefillContact ?? undefined,
        },
        notes: { reference: instruction.reference },
        handler: (result: RazorpayCheckoutResult) =>
          resolve({
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          }),
        modal: {
          ondismiss: () => resolve(null),
        },
      });

      try {
        checkout.open();
      } catch (error) {
        reject(error);
      }
    });
  }

  private loadCheckoutScript(): Promise<void> {
    this.checkoutScript ??= new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Allow a retry on the next attempt instead of caching the failure.
        this.checkoutScript = undefined;
        reject(new Error('Unable to load the payment window.'));
      };
      document.head.appendChild(script);
    });

    return this.checkoutScript;
  }
}
