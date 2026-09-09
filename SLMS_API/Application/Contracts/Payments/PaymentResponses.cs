using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Payments;

/// <summary>Whether tenants can pay Lexora online, or must still pay offline.</summary>
public class PlatformPaymentStatusResponse
{
    public bool Enabled { get; set; }

    public string DisplayName { get; set; } = "Lexora";

    public string Currency { get; set; } = "INR";

    /// <summary>True when the configured key is a Razorpay test key — no real money moves.</summary>
    public bool IsTestMode { get; set; }
}

public class PaymentAccountResponse
{
    public Guid? Id { get; set; }

    public Guid InstitutionId { get; set; }

    public PaymentAccountMode Mode { get; set; }

    public string? UpiPayeeName { get; set; }

    public string? UpiVpa { get; set; }

    public string? RazorpayKeyId { get; set; }

    /// <summary>True when the saved key id is a test key, so the screen can say so plainly.</summary>
    public bool IsTestMode { get; set; }

    /// <summary>Secrets are never returned — the UI only shows whether they exist.</summary>
    public bool HasRazorpayKeySecret { get; set; }

    public bool HasRazorpayWebhookSecret { get; set; }

    /// <summary>URL the institution pastes into its Razorpay dashboard.</summary>
    public string? WebhookUrl { get; set; }

    public bool IsActive { get; set; }

    public bool IsReadyToCollect { get; set; }

    public DateTime? FirstCapturedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>
/// What the payer needs in order to pay. One shape for both routes: the client renders
/// the UPI block or the gateway block based on <see cref="Mode"/>, so an institution
/// switching modes needs no client change.
/// </summary>
public class PaymentInstructionResponse
{
    public Guid TransactionId { get; set; }

    public string Reference { get; set; } = string.Empty;

    public PaymentAccountMode Mode { get; set; }

    public PaymentProvider Provider { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "INR";

    public string? Note { get; set; }

    public UpiPaymentInstruction? Upi { get; set; }

    public RazorpayPaymentInstruction? Razorpay { get; set; }
}

public class UpiPaymentInstruction
{
    public string Vpa { get; set; } = string.Empty;

    public string PayeeName { get; set; } = string.Empty;

    /// <summary>`upi://pay?…` deep link — tapping it opens the payer's UPI app.</summary>
    public string PaymentUri { get; set; } = string.Empty;

    /// <summary>The same link as a scannable PNG data URI, for desktop payers.</summary>
    public string QrCodeBase64 { get; set; } = string.Empty;

    /// <summary>Text the payer should keep with the transfer so it can be matched.</summary>
    public string TransactionNote { get; set; } = string.Empty;
}

public class RazorpayPaymentInstruction
{
    public string KeyId { get; set; } = string.Empty;

    public string OrderId { get; set; } = string.Empty;

    public long AmountInPaise { get; set; }

    public string DisplayName { get; set; } = "Lexora";

    /// <summary>Checkout is running against test keys — the payer should not use a real card.</summary>
    public bool IsTestMode { get; set; }

    public string? PrefillName { get; set; }

    public string? PrefillEmail { get; set; }

    public string? PrefillContact { get; set; }
}

public class PaymentTransactionResponse
{
    public Guid Id { get; set; }

    public string Reference { get; set; } = string.Empty;

    public PaymentPurpose Purpose { get; set; }

    public PaymentProvider Provider { get; set; }

    public PaymentStatus Status { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "INR";

    public Guid? InstitutionId { get; set; }

    public string? InstitutionName { get; set; }

    public Guid? MemberId { get; set; }

    public string? MemberName { get; set; }

    public string? PayerName { get; set; }

    public string? PayerEmail { get; set; }

    public string? PayerPhone { get; set; }

    public string? Note { get; set; }

    public string? ProviderOrderId { get; set; }

    public string? ProviderPaymentId { get; set; }

    public string? UpiUtr { get; set; }

    public string? FailureReason { get; set; }

    public string? VerifiedByUserId { get; set; }

    public DateTime? VerifiedAtUtc { get; set; }

    public DateTime? CapturedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
