namespace SLMS_API.Application.Services.Interfaces;

public interface IAppEmailService
{
    Task SendRegistrationConfirmationAsync(
        string toEmail,
        string fullName,
        string? organizationName,
        string packageName,
        decimal packagePrice,
        string? status,
        IReadOnlyCollection<string>? addons,
        CancellationToken cancellationToken = default);

    Task SendTenantApprovalAsync(
        string toEmail,
        string fullName,
        string? organizationName,
        string packageName,
        decimal? finalApprovedAmount,
        string? adminRemarks,
        CancellationToken cancellationToken = default);

    Task SendForgotPasswordAsync(
        string toEmail,
        string? fullName,
        string resetUrl,
        CancellationToken cancellationToken = default);

    Task SendSupportTicketNotificationAsync(
        string requesterEmail,
        string requesterName,
        string? organizationName,
        string subject,
        string category,
        string priority,
        string description,
        Guid ticketId,
        CancellationToken cancellationToken = default);

    Task SendMemberWelcomeAsync(
        string toEmail,
        string fullName,
        string membershipNo,
        string? libraryName,
        string? planName,
        string temporaryPassword,
        CancellationToken cancellationToken = default);
}
