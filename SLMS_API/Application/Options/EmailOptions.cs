namespace SLMS_API.Application.Options;

public class EmailOptions
{
    public const string SectionName = "Email";

    public bool Enabled { get; set; } = true;
    public string FromAddress { get; set; } = "noreply@uniappx.in";
    public string FromName { get; set; } = "Lexora";
    public string SupportEmail { get; set; } = "support@uniappx.in";
    public string SuperAdminEmail { get; set; } = "yogeshyadav@uniappx.in";
    public string? SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUser { get; set; } = "support@uniappx.in";
    public string? SmtpPassword { get; set; }
    public bool UseSsl { get; set; } = true;

    public EmailFeatureFlags Features { get; set; } = new();
}

public class EmailFeatureFlags
{
    public bool SendOnRegistration { get; set; } = true;
    public bool SendOnApproval { get; set; } = true;
    public bool SendOnForgotPassword { get; set; } = true;
    public bool SendOnSupportTicket { get; set; } = true;
    public bool SendOnMemberCreated { get; set; } = true;
}
