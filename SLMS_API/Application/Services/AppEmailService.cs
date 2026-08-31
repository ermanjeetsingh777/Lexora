using System.Net;
using Microsoft.Extensions.Options;
using SLMS_API.Application.Options;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Application.Services;

public class AppEmailService : IAppEmailService
{
    private readonly IEmailSender _emailSender;
    private readonly EmailOptions _emailOptions;
    private readonly AppOptions _appOptions;
    private readonly ILogger<AppEmailService> _logger;

    public AppEmailService(
        IEmailSender emailSender,
        IOptions<EmailOptions> emailOptions,
        IOptions<AppOptions> appOptions,
        ILogger<AppEmailService> logger)
    {
        _emailSender = emailSender;
        _emailOptions = emailOptions.Value;
        _appOptions = appOptions.Value;
        _logger = logger;
    }

    public async Task SendRegistrationConfirmationAsync(
        string toEmail,
        string fullName,
        string? organizationName,
        string packageName,
        decimal packagePrice,
        string? status,
        IReadOnlyCollection<string>? addons,
        CancellationToken cancellationToken = default)
    {
        if (!_emailOptions.Features.SendOnRegistration)
        {
            _logger.LogInformation("Registration email skipped (SendOnRegistration=false) for {Email}", toEmail);
            return;
        }

        var frontendBase = _appOptions.FrontendBaseUrl.TrimEnd('/');
        var isPending = string.Equals(status, "Pending", StringComparison.OrdinalIgnoreCase);
        var statusBadge = isPending
            ? "<span style=\"display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;background-color:#fef3c7;color:#92400e;\">Pending SuperAdmin Verification</span>"
            : "<span style=\"display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;background-color:#d1fae5;color:#065f46;\">Active & Ready</span>";

        var statusMessage = isPending
            ? "Your registration has been submitted successfully! Since you selected a paid package, our SuperAdmin team is verifying your payment details. Once verified, your workspace will be fully activated."
            : "Welcome to Lexora! Your free trial account has been activated immediately. You can now log in to set up your branches, libraries, and start enrolling members.";

        var addonsHtml = addons != null && addons.Count > 0
            ? string.Join("", addons.Select(a => $"<li style=\"margin-bottom:4px;color:#374151;\">{WebUtility.HtmlEncode(a)}</li>"))
            : "<li style=\"color:#6b7280;\">None selected</li>";

        var html = $"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Lexora</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:32px 30px;text-align:center;">
                      <div style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:rgba(255,255,255,0.15);color:#e0e7ff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
                        Lexora Smart Library System
                      </div>
                      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Welcome to Lexora!</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding:32px 30px;">
                      <p style="margin-top:0;margin-bottom:16px;color:#1f2937;font-size:16px;line-height:1.5;">
                        Hello <strong>{WebUtility.HtmlEncode(fullName)}</strong>,
                      </p>
                      <p style="margin-bottom:24px;color:#4b5563;font-size:15px;line-height:1.6;">
                        Thank you for choosing Lexora for your library management operations. Here is a summary of your registration details:
                      </p>

                      <!-- Summary Card -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;overflow:hidden;">
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;width:35%;">Organization</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(organizationName ?? "Library Institution")}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Registered Email</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(toEmail)}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Selected Plan</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(packageName)} {(packagePrice > 0 ? $"(₹{packagePrice:N0})" : "(Free Trial)")}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Account Status</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;">{statusBadge}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;font-size:14px;color:#6b7280;vertical-align:top;">Capacity Add-ons</td>
                          <td style="padding:14px 18px;font-size:14px;">
                            <ul style="margin:0;padding-left:18px;">
                              {addonsHtml}
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <div style="background-color:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;border-radius:6px;margin-bottom:28px;">
                        <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.5;">
                          {statusMessage}
                        </p>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="{frontendBase}/login" style="display:inline-block;padding:14px 32px;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;box-shadow:0 2px 4px rgba(79,70,229,0.3);">
                          Login to Your Workspace
                        </a>
                      </div>

                      <p style="margin-bottom:0;color:#6b7280;font-size:13px;line-height:1.5;text-align:center;">
                        Need quick assistance? Contact our support at <a href="mailto:{_emailOptions.SupportEmail}" style="color:#4f46e5;text-decoration:underline;">{_emailOptions.SupportEmail}</a> or WhatsApp <a href="https://wa.me/919992823909" style="color:#4f46e5;text-decoration:underline;">+91 9992823909</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
                      <p style="margin:0 0 6px 0;color:#9ca3af;font-size:12px;">
                        © {DateTime.UtcNow.Year} Lexora (Uniappx). All rights reserved.
                      </p>
                      <p style="margin:0;color:#9ca3af;font-size:11px;">
                        This is an automated notification from <a href="mailto:{_emailOptions.FromAddress}" style="color:#9ca3af;">{_emailOptions.FromAddress}</a>. Please do not reply directly to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

        await _emailSender.SendAsync(toEmail, "Welcome to Lexora - Registration Confirmation", html, cancellationToken);
    }

    public async Task SendTenantApprovalAsync(
        string toEmail,
        string fullName,
        string? organizationName,
        string packageName,
        decimal? finalApprovedAmount,
        string? adminRemarks,
        CancellationToken cancellationToken = default)
    {
        if (!_emailOptions.Features.SendOnApproval)
        {
            _logger.LogInformation("Approval email skipped (SendOnApproval=false) for {Email}", toEmail);
            return;
        }

        var frontendBase = _appOptions.FrontendBaseUrl.TrimEnd('/');
        var remarksSection = !string.IsNullOrWhiteSpace(adminRemarks)
            ? $"""
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Admin Remarks</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(adminRemarks)}</td>
              </tr>
              """
            : "";

        var html = $"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Workspace Activated</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#065f46 0%,#047857 100%);padding:32px 30px;text-align:center;">
                      <div style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:rgba(255,255,255,0.2);color:#d1fae5;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
                        Account Approved
                      </div>
                      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Your Lexora Workspace is Active! 🎉</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding:32px 30px;">
                      <p style="margin-top:0;margin-bottom:16px;color:#1f2937;font-size:16px;line-height:1.5;">
                        Hello <strong>{WebUtility.HtmlEncode(fullName)}</strong>,
                      </p>
                      <p style="margin-bottom:24px;color:#4b5563;font-size:15px;line-height:1.6;">
                        Great news! Your Lexora tenant registration has been verified and approved by our SuperAdmin team. Your library management workspace is now fully activated.
                      </p>

                      <!-- Activation Details -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;overflow:hidden;">
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;width:35%;">Organization</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(organizationName ?? "Library Institution")}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Approved Plan</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(packageName)}</td>
                        </tr>
                        {(finalApprovedAmount.HasValue ? $"""
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Approved Amount</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#059669;">₹{finalApprovedAmount.Value:N2}</td>
                        </tr>
                        """ : "")}
                        {remarksSection}
                        <tr>
                          <td style="padding:14px 18px;font-size:14px;color:#6b7280;">Status</td>
                          <td style="padding:14px 18px;font-size:14px;font-weight:700;color:#059669;">✓ Approved & Live</td>
                        </tr>
                      </table>

                      <!-- Next steps -->
                      <div style="background-color:#f0fdf4;border-left:4px solid #22c55e;padding:14px 16px;border-radius:6px;margin-bottom:28px;">
                        <h4 style="margin:0 0 6px 0;font-size:14px;color:#15803d;font-weight:700;">What you can do now:</h4>
                        <ul style="margin:0;padding-left:20px;font-size:13px;color:#166534;line-height:1.5;">
                          <li>Access full dashboard analytics & reporting</li>
                          <li>Manage branch networks, libraries, and seat layouts</li>
                          <li>Add staff users and enroll library members</li>
                          <li>Issue books, track attendance via QR kiosks, and collect fees</li>
                        </ul>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="{frontendBase}/dashboard" style="display:inline-block;padding:14px 32px;background-color:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;box-shadow:0 2px 4px rgba(5,150,105,0.3);">
                          Launch Lexora Dashboard
                        </a>
                      </div>

                      <p style="margin-bottom:0;color:#6b7280;font-size:13px;line-height:1.5;text-align:center;">
                        Have questions or need onboarding assistance? Contact us at <a href="mailto:{_emailOptions.SupportEmail}" style="color:#059669;text-decoration:underline;">{_emailOptions.SupportEmail}</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
                      <p style="margin:0 0 6px 0;color:#9ca3af;font-size:12px;">
                        © {DateTime.UtcNow.Year} Lexora (Uniappx). All rights reserved.
                      </p>
                      <p style="margin:0;color:#9ca3af;font-size:11px;">
                        Automated notification from <a href="mailto:{_emailOptions.FromAddress}" style="color:#9ca3af;">{_emailOptions.FromAddress}</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

        await _emailSender.SendAsync(toEmail, "🎉 Account Approved - Your Lexora Workspace is Active!", html, cancellationToken);
    }

    public async Task SendForgotPasswordAsync(
        string toEmail,
        string? fullName,
        string resetUrl,
        CancellationToken cancellationToken = default)
    {
        if (!_emailOptions.Features.SendOnForgotPassword)
        {
            _logger.LogInformation("Forgot password email skipped (SendOnForgotPassword=false) for {Email}", toEmail);
            return;
        }

        var greetingName = !string.IsNullOrWhiteSpace(fullName) ? $" {WebUtility.HtmlEncode(fullName)}" : "";

        var html = $"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Lexora Password</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 30px;text-align:center;">
                      <div style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:rgba(255,255,255,0.15);color:#e2e8f0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
                        Account Security
                      </div>
                      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Password Reset Request</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding:32px 30px;">
                      <p style="margin-top:0;margin-bottom:16px;color:#1f2937;font-size:16px;line-height:1.5;">
                        Hello{greetingName},
                      </p>
                      <p style="margin-bottom:24px;color:#4b5563;font-size:15px;line-height:1.6;">
                        We received a request to reset the password for your Lexora account (<strong>{WebUtility.HtmlEncode(toEmail)}</strong>). Click the button below to set a new password:
                      </p>

                      <!-- CTA Button -->
                      <div style="text-align:center;margin-bottom:28px;">
                        <a href="{WebUtility.HtmlEncode(resetUrl)}" style="display:inline-block;padding:14px 34px;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;box-shadow:0 2px 4px rgba(79,70,229,0.3);">
                          Reset My Password
                        </a>
                      </div>

                      <!-- 1 Hour Expiration Notice -->
                      <div style="background-color:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:6px;margin-bottom:24px;">
                        <p style="margin:0;font-size:13px;color:#b45309;line-height:1.5;">
                          ⏰ <strong>Security Notice:</strong> For your protection, this password reset link is <strong>valid for 1 hour only</strong>. If the link expires, you can easily request a new one from the login page.
                        </p>
                      </div>

                      <p style="margin-bottom:16px;color:#6b7280;font-size:13px;line-height:1.5;">
                        If you did not request this password reset, please ignore this email or contact our support if you have security concerns. Your current password will remain unchanged.
                      </p>

                      <p style="margin-bottom:0;color:#9ca3af;font-size:12px;word-break:break-all;">
                        Or copy and paste this link into your browser:<br>
                        <a href="{WebUtility.HtmlEncode(resetUrl)}" style="color:#4f46e5;">{WebUtility.HtmlEncode(resetUrl)}</a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
                      <p style="margin:0 0 6px 0;color:#9ca3af;font-size:12px;">
                        © {DateTime.UtcNow.Year} Lexora (Uniappx). All rights reserved.
                      </p>
                      <p style="margin:0;color:#9ca3af;font-size:11px;">
                        Automated security email from <a href="mailto:{_emailOptions.FromAddress}" style="color:#9ca3af;">{_emailOptions.FromAddress}</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

        await _emailSender.SendAsync(toEmail, "Reset Your Lexora Password (Valid for 1 Hour)", html, cancellationToken);
    }

    public async Task SendSupportTicketNotificationAsync(
        string requesterEmail,
        string requesterName,
        string? organizationName,
        string subject,
        string category,
        string priority,
        string description,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        if (!_emailOptions.Features.SendOnSupportTicket)
        {
            _logger.LogInformation("Support ticket email skipped (SendOnSupportTicket=false) for Ticket {TicketId}", ticketId);
            return;
        }

        var recipients = $"{_emailOptions.SupportEmail};{_emailOptions.SuperAdminEmail}";

        var priorityBadge = priority.ToLower() switch
        {
            "urgent" => "<span style=\"color:#b91c1c;font-weight:700;\">🔴 Urgent</span>",
            "high" => "<span style=\"color:#c2410c;font-weight:700;\">🟠 High</span>",
            "medium" => "<span style=\"color:#b45309;font-weight:700;\">🟡 Medium</span>",
            _ => "<span style=\"color:#4b5563;\">🟢 Low</span>"
        };

        var html = $"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Support Ticket</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#312e81 0%,#4338ca 100%);padding:30px;text-align:center;">
                      <div style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:rgba(255,255,255,0.2);color:#e0e7ff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
                        Lexora Support Desk
                      </div>
                      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">New Support Ticket Submitted</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding:32px 30px;">
                      <p style="margin-top:0;margin-bottom:20px;color:#1f2937;font-size:15px;line-height:1.5;">
                        A user has submitted a new support request / improvement / bug inquiry via the Lexora portal:
                      </p>

                      <!-- Ticket Summary -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;overflow:hidden;">
                        <tr>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:30%;">Ticket ID</td>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#111827;">#{ticketId.ToString()[..8].ToUpper()}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Requester</td>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(requesterName)} ({WebUtility.HtmlEncode(requesterEmail)})</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Organization</td>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(organizationName ?? "Unassigned")}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Category</td>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#111827;">{WebUtility.HtmlEncode(category)}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Priority</td>
                          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;">{priorityBadge}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Subject</td>
                          <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#111827;">{WebUtility.HtmlEncode(subject)}</td>
                        </tr>
                      </table>

                      <!-- Message Body -->
                      <h4 style="margin:0 0 8px 0;font-size:14px;color:#374151;">Description / Request Details:</h4>
                      <div style="background-color:#ffffff;border:1px solid #e5e7eb;padding:16px;border-radius:8px;font-size:14px;color:#1f2937;line-height:1.6;white-space:pre-wrap;margin-bottom:24px;">
                        {WebUtility.HtmlEncode(description)}
                      </div>

                      <div style="text-align:center;">
                        <a href="{_appOptions.FrontendBaseUrl.TrimEnd('/')}/support" style="display:inline-block;padding:12px 28px;background-color:#4338ca;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">
                          Open Support Console
                        </a>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f9fafb;padding:18px 30px;border-top:1px solid #e5e7eb;text-align:center;">
                      <p style="margin:0;color:#9ca3af;font-size:11px;">
                        Automated notification sent to {_emailOptions.SupportEmail} & {_emailOptions.SuperAdminEmail}.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

        await _emailSender.SendAsync(recipients, $"[Support Ticket] {category}: {subject}", html, cancellationToken);
    }

    public async Task SendMemberWelcomeAsync(
        string toEmail,
        string fullName,
        string membershipNo,
        string? libraryName,
        string? planName,
        string temporaryPassword,
        CancellationToken cancellationToken = default)
    {
        if (!_emailOptions.Features.SendOnMemberCreated)
        {
            _logger.LogInformation("Member welcome email skipped (SendOnMemberCreated=false) for {Email}", toEmail);
            return;
        }

        var frontendBase = _appOptions.FrontendBaseUrl.TrimEnd('/');

        var html = $"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to the Library</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);padding:32px 30px;text-align:center;">
                      <div style="display:inline-block;padding:6px 16px;border-radius:9999px;background-color:rgba(255,255,255,0.2);color:#e0f2fe;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
                        Member Registration
                      </div>
                      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Welcome to {WebUtility.HtmlEncode(libraryName ?? "the Library")}!</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding:32px 30px;">
                      <p style="margin-top:0;margin-bottom:16px;color:#1f2937;font-size:16px;line-height:1.5;">
                        Hello <strong>{WebUtility.HtmlEncode(fullName)}</strong>,
                      </p>
                      <p style="margin-bottom:24px;color:#4b5563;font-size:15px;line-height:1.6;">
                        Your membership account has been created successfully. You can now log in to view your attendance history, active membership plans, seat details, and digital library resources.
                      </p>

                      <!-- Credentials Card -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;margin-bottom:24px;overflow:hidden;">
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e0f2fe;font-size:14px;color:#0369a1;width:35%;">Membership No</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e0f2fe;font-size:14px;font-weight:700;color:#0c4a6e;">{WebUtility.HtmlEncode(membershipNo)}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e0f2fe;font-size:14px;color:#0369a1;">Login Email</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e0f2fe;font-size:14px;font-weight:600;color:#0c4a6e;">{WebUtility.HtmlEncode(toEmail)}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;border-bottom:1px solid #e0f2fe;font-size:14px;color:#0369a1;">Initial Password</td>
                          <td style="padding:14px 18px;border-bottom:1px solid #e0f2fe;font-size:14px;font-weight:700;color:#0c4a6e;font-family:monospace;">{WebUtility.HtmlEncode(temporaryPassword)}</td>
                        </tr>
                        <tr>
                          <td style="padding:14px 18px;font-size:14px;color:#0369a1;">Membership Plan</td>
                          <td style="padding:14px 18px;font-size:14px;font-weight:600;color:#0c4a6e;">{WebUtility.HtmlEncode(planName ?? "Standard Plan")}</td>
                        </tr>
                      </table>

                      <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin-bottom:28px;">
                        <p style="margin:0;font-size:13px;color:#b45309;line-height:1.5;">
                          🔒 <strong>Security Tip:</strong> Please change your password after logging in for the first time via your profile settings.
                        </p>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="{frontendBase}/login" style="display:inline-block;padding:14px 32px;background-color:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;box-shadow:0 2px 4px rgba(2,132,199,0.3);">
                          Login to Member Portal
                        </a>
                      </div>

                      <p style="margin-bottom:0;color:#6b7280;font-size:13px;line-height:1.5;text-align:center;">
                        If you need any assistance, please reach out to the library helpdesk or contact <a href="mailto:{_emailOptions.SupportEmail}" style="color:#0284c7;text-decoration:underline;">{_emailOptions.SupportEmail}</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
                      <p style="margin:0 0 6px 0;color:#9ca3af;font-size:12px;">
                        © {DateTime.UtcNow.Year} Lexora (Uniappx). All rights reserved.
                      </p>
                      <p style="margin:0;color:#9ca3af;font-size:11px;">
                        Automated notification from <a href="mailto:{_emailOptions.FromAddress}" style="color:#9ca3af;">{_emailOptions.FromAddress}</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

        await _emailSender.SendAsync(toEmail, $"Welcome to {libraryName ?? "Lexora Library"} - Your Login Credentials", html, cancellationToken);
    }
}
