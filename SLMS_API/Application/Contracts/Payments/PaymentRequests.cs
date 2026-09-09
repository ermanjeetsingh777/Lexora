using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Payments;

/// <summary>
/// Saves how an institution collects money. Switching <see cref="Mode"/> is all it takes
/// to move from UPI to a gateway — secrets left blank keep their stored value.
/// </summary>
public class SavePaymentAccountRequest
{
    public PaymentAccountMode Mode { get; set; } = PaymentAccountMode.None;

    public string? UpiPayeeName { get; set; }

    public string? UpiVpa { get; set; }

    public string? RazorpayKeyId { get; set; }

    /// <summary>Leave blank to keep the stored secret.</summary>
    public string? RazorpayKeySecret { get; set; }

    /// <summary>Leave blank to keep the stored secret.</summary>
    public string? RazorpayWebhookSecret { get; set; }

    public bool IsActive { get; set; } = true;
}

public class InitiateMemberFeePaymentRequest
{
    /// <summary>Defaults to the member's outstanding dues when omitted.</summary>
    public decimal? Amount { get; set; }

    public Guid? MemberPlanId { get; set; }

    public string? Note { get; set; }
}

public class InitiateSubscriptionPaymentRequest
{
    /// <summary>Defaults to the signed-in tenant's pending package when omitted.</summary>
    public Guid? UserPackageId { get; set; }
}

/// <summary>Payer confirms a UPI transfer by supplying the bank reference.</summary>
public class SubmitUpiReferenceRequest
{
    public string Utr { get; set; } = string.Empty;

    public string? Note { get; set; }
}

public class RejectPaymentRequest
{
    public string Reason { get; set; } = string.Empty;
}

/// <summary>Payload the Razorpay checkout widget hands back to the browser.</summary>
public class VerifyRazorpayPaymentRequest
{
    public string RazorpayOrderId { get; set; } = string.Empty;

    public string RazorpayPaymentId { get; set; } = string.Empty;

    public string RazorpaySignature { get; set; } = string.Empty;
}

public class PaymentTransactionFilter
{
    public Guid? InstitutionId { get; set; }

    public Guid? MemberId { get; set; }

    public PaymentPurpose? Purpose { get; set; }

    public PaymentStatus? Status { get; set; }

    public string? Search { get; set; }

    public int Take { get; set; } = 100;
}
