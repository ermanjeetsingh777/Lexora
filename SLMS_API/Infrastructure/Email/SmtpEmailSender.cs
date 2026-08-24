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
        if (string.IsNullOrWhiteSpace(_options.SmtpHost))
        {
            _logger.LogWarning(
                "Email not sent (SMTP not configured). To: {Email}, Subject: {Subject}, Body preview: {Preview}",
                toEmail,
                subject,
                htmlBody.Length > 200 ? htmlBody[..200] + "…" : htmlBody);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(toEmail);

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
        _logger.LogInformation("Email sent to {Email} with subject {Subject}", toEmail, subject);
    }
}
