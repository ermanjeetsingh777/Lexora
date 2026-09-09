/** Mirrors SLMS_API `PaymentAccountMode`. */
export enum PaymentAccountMode {
  None = 0,
  UpiManual = 1,
  Razorpay = 2,
}

/** Mirrors SLMS_API `PaymentProvider`. */
export enum PaymentProvider {
  Upi = 1,
  Razorpay = 2,
}

/** Mirrors SLMS_API `PaymentPurpose`. */
export enum PaymentPurpose {
  MemberFee = 1,
  TenantSubscription = 2,
}

/** Mirrors SLMS_API `PaymentStatus`. */
export enum PaymentStatus {
  Created = 1,
  AwaitingVerification = 2,
  Captured = 3,
  Failed = 4,
  Cancelled = 5,
  Refunded = 6,
}

/** Whether tenants can pay Lexora online, or must still use the offline route. */
export interface PlatformPaymentStatus {
  enabled: boolean;
  displayName: string;
  currency: string;
  /** Razorpay test keys are in use — no real money moves. */
  isTestMode: boolean;
}

export interface PaymentAccount {
  id?: string;
  institutionId: string;
  mode: PaymentAccountMode;
  upiPayeeName?: string | null;
  upiVpa?: string | null;
  razorpayKeyId?: string | null;
  isTestMode: boolean;
  hasRazorpayKeySecret: boolean;
  hasRazorpayWebhookSecret: boolean;
  webhookUrl?: string | null;
  isActive: boolean;
  isReadyToCollect: boolean;
  firstCapturedAtUtc?: string | null;
  updatedAtUtc?: string | null;
}

export interface SavePaymentAccountRequest {
  mode: PaymentAccountMode;
  upiPayeeName?: string | null;
  upiVpa?: string | null;
  razorpayKeyId?: string | null;
  /** Blank keeps the stored secret. */
  razorpayKeySecret?: string | null;
  razorpayWebhookSecret?: string | null;
  isActive: boolean;
}

export interface UpiPaymentInstruction {
  vpa: string;
  payeeName: string;
  paymentUri: string;
  transactionNote: string;
  qrCodeBase64: string;
}

export interface RazorpayPaymentInstruction {
  keyId: string;
  orderId: string;
  amountInPaise: number;
  displayName: string;
  isTestMode: boolean;
  prefillName?: string | null;
  prefillEmail?: string | null;
  prefillContact?: string | null;
}

/**
 * One shape for both routes. Components switch on `mode`, so an institution moving
 * from UPI to a gateway needs no code change here.
 */
export interface PaymentInstruction {
  transactionId: string;
  reference: string;
  mode: PaymentAccountMode;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  note?: string | null;
  upi?: UpiPaymentInstruction | null;
  razorpay?: RazorpayPaymentInstruction | null;
}

export interface PaymentTransaction {
  id: string;
  reference: string;
  purpose: PaymentPurpose;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  institutionId?: string | null;
  institutionName?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  note?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  upiUtr?: string | null;
  failureReason?: string | null;
  verifiedByUserId?: string | null;
  verifiedAtUtc?: string | null;
  capturedAtUtc?: string | null;
  createdAtUtc: string;
}

export interface InitiateMemberFeePaymentRequest {
  amount?: number | null;
  memberPlanId?: string | null;
  note?: string | null;
}

export interface VerifyRazorpayPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentTransactionQuery {
  institutionId?: string;
  memberId?: string;
  purpose?: PaymentPurpose;
  status?: PaymentStatus;
  search?: string;
  take?: number;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.Created]: 'Awaiting payment',
  [PaymentStatus.AwaitingVerification]: 'Awaiting verification',
  [PaymentStatus.Captured]: 'Paid',
  [PaymentStatus.Failed]: 'Failed',
  [PaymentStatus.Cancelled]: 'Cancelled',
  [PaymentStatus.Refunded]: 'Refunded',
};
