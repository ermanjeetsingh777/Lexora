namespace SLMS_API.Application.Options;

/// <summary>
/// Master kill switch for Razorpay (platform tenant payments and institution member fees).
/// When false, only offline / UPI-manual collection remains available.
/// </summary>
public class PaymentGatewayOptions
{
    public const string SectionName = "PaymentGateway";

    /// <summary>When false, online Razorpay checkout is disabled everywhere.</summary>
    public bool Enabled { get; set; }
}
