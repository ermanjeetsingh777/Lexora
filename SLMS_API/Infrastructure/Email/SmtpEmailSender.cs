using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using SLMS_API.Application.Options;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Infrastructure.Email;

public class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation(
                "Email sending disabled (Email:Enabled=false). To: {Email}, Subject: {Subject}",
                toEmail,
                subject);
            return;
        }

        if (string.IsNullOrWhiteSpace(_options.SmtpHost))
        {
            _logger.LogWarning(
                "Email not sent (SMTP host not configured). To: {Email}, Subject: {Subject}, Body preview: {Preview}",
                toEmail,
                subject,
                htmlBody.Length > 200 ? htmlBody[..200] + "…" : htmlBody);
            return;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_options.FromAddress, _options.FromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
            };

            var emailAddresses = toEmail.Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var email in emailAddresses)
            {
                message.To.Add(email);
            }

            using var client = new SmtpClient(_options.SmtpHost, _options.SmtpPort)
            {
                EnableSsl = _options.UseSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
            };

            if (!string.IsNullOrWhiteSpace(_options.SmtpUser))
            {
                client.Credentials = new NetworkCredential(_options.SmtpUser, _options.SmtpPassword);
            }

            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("Email successfully sent to {Email} with subject '{Subject}'", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email} with subject '{Subject}'", toEmail, subject);
        }
    }
}
