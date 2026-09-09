using SLMS_API.Common.Enums;

namespace SLMS_API.Domain.Entities;

/// <summary>
/// One attempt to collect money, whatever the route: a Razorpay order, a UPI transfer
/// confirmed by hand, or a tenant paying their Lexora subscription. Every surface writes
/// to this ledger so reporting and reconciliation do not care which provider was used.
/// </summary>
public class PaymentTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public PaymentPurpose Purpose { get; set; }

    public PaymentProvider Provider { get; set; }

    public PaymentStatus Status { get; set; } = PaymentStatus.Created;

    /// <summary>Human-readable reference shown to the payer, e.g. <c>LEX-7F3A2B91</c>.</summary>
    public string Reference { get; set; } = string.Empty;

    /// <summary>Null for platform (tenant subscription) payments.</summary>
    public Guid? InstitutionId { get; set; }

    public Guid? PaymentAccountId { get; set; }

    public PaymentAccount? PaymentAccount { get; set; }

    public Guid? MemberId { get; set; }

    public Guid? MemberPlanId { get; set; }

    /// <summary>Identity user who owes the money (tenant subscription) or who initiated it.</summary>
    public string? UserId { get; set; }

    public Guid? UserPackageId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "INR";

    public string? PayerName { get; set; }

    public string? PayerEmail { get; set; }

    public string? PayerPhone { get; set; }

    public string? Note { get; set; }

    public string? ProviderOrderId { get; set; }

    /// <summary>Gateway payment id. Unique when present — this is the idempotency key.</summary>
    public string? ProviderPaymentId { get; set; }

    public string? ProviderSignature { get; set; }

    /// <summary>Bank reference the member types in after paying a UPI VPA.</summary>
    public string? UpiUtr { get; set; }

    public string? FailureReason { get; set; }

    /// <summary>Raw webhook / callback payload, kept for disputes.</summary>
    public string? RawPayload { get; set; }

    /// <summary>Who confirmed a manual UPI payment.</summary>
    public string? VerifiedByUserId { get; set; }

    public DateTime? VerifiedAtUtc { get; set; }

    public DateTime? CapturedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string? CreatedBy { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
