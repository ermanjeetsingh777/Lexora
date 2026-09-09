namespace SLMS_API.Application.Options;

/// <summary>
/// Lexora's own Razorpay account — used only for tenants paying their subscription.
/// Institutions collecting member fees use their own credentials from
/// <see cref="Domain.Entities.PaymentAccount"/>.
/// </summary>
public class RazorpayOptions
{
    public const string SectionName = "Razorpay";

    /// <summary>When false, tenants can only pay offline (slip + SuperAdmin approval).</summary>
    public bool Enabled { get; set; }

    public string? KeyId { get; set; }

    public string? KeySecret { get; set; }

    /// <summary>Secret configured on the Razorpay dashboard for the platform webhook.</summary>
    public string? WebhookSecret { get; set; }

    public string Currency { get; set; } = "INR";

    /// <summary>Merchant name shown on the checkout dialog.</summary>
    public string DisplayName { get; set; } = "Lexora";

    /// <summary>Base URL of this API, used to show the webhook URL in the UI.</summary>
    public string? PublicApiBaseUrl { get; set; }
}
