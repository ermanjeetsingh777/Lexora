namespace SLMS_API.Common.Enums;

/// <summary>How an institution collects money from its members.</summary>
public enum PaymentAccountMode
{
    /// <summary>Not configured — only offline / manual entry is available.</summary>
    None = 0,

    /// <summary>Members pay a UPI VPA directly; the payment is confirmed by a human.</summary>
    UpiManual = 1,

    /// <summary>Members pay through Razorpay checkout; the webhook confirms it.</summary>
    Razorpay = 2
}

/// <summary>Who the money is collected by.</summary>
public enum PaymentAccountOwner
{
    /// <summary>Lexora's own account — tenants paying for their subscription.</summary>
    Platform = 1,

    /// <summary>An institution's own account — members paying their fees.</summary>
    Institution = 2
}

public enum PaymentProvider
{
    /// <summary>Direct UPI transfer, confirmed manually with a UTR.</summary>
    Upi = 1,

    Razorpay = 2
}

public enum PaymentPurpose
{
    /// <summary>A member paying membership fees to their library.</summary>
    MemberFee = 1,

    /// <summary>A tenant paying Lexora for their subscription package.</summary>
    TenantSubscription = 2,

    /// <summary>A tenant paying Lexora for a capacity add-on on top of their package.</summary>
    TenantAddon = 3
}

public enum PaymentStatus
{
    /// <summary>Order created; the payer has not completed anything yet.</summary>
    Created = 1,

    /// <summary>Payer claims to have paid (UPI reference submitted); needs human confirmation.</summary>
    AwaitingVerification = 2,

    /// <summary>Money confirmed — by gateway webhook or by a verifier.</summary>
    Captured = 3,

    Failed = 4,

    Cancelled = 5,

    Refunded = 6
}
