using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

/// <summary>
/// How one institution collects money from its members. Switching between UPI and a
/// gateway is a data change on this row — nothing in the payment pipeline is
/// mode-specific outside <see cref="Mode"/>.
/// </summary>
public class PaymentAccount : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Owning institution. One account per institution.</summary>
    public Guid InstitutionId { get; set; }

    public Institution Institution { get; set; } = default!;

    public PaymentAccountMode Mode { get; set; } = PaymentAccountMode.None;

    /// <summary>Display name shown to the member in their UPI app.</summary>
    public string? UpiPayeeName { get; set; }

    /// <summary>Virtual payment address, e.g. <c>library@okhdfcbank</c>.</summary>
    public string? UpiVpa { get; set; }

    /// <summary>Public Razorpay key id — safe to send to the browser.</summary>
    public string? RazorpayKeyId { get; set; }

    /// <summary>Razorpay key secret, encrypted with the data protection API.</summary>
    public string? RazorpayKeySecretProtected { get; set; }

    /// <summary>Razorpay webhook secret, encrypted with the data protection API.</summary>
    public string? RazorpayWebhookSecretProtected { get; set; }

    /// <summary>
    /// Opaque segment in this account's webhook URL. Every institution has its own
    /// webhook secret, so the URL has to say which secret verifies the payload.
    /// </summary>
    public string WebhookToken { get; set; } = string.Empty;

    /// <summary>Set the first time a payment is captured through this account.</summary>
    public DateTime? FirstCapturedAtUtc { get; set; }
}
