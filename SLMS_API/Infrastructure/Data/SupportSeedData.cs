using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Data;

public static class SupportSeedData
{
    public static IReadOnlyCollection<KnowledgeBaseArticle> GetArticles() =>
    [
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111101"),
            Title = "How do I assign seats to members?",
            Category = "Seats",
            Tags = "seats,members,allocation",
            Body = "Open Seats → Layout, click a seat to open the drawer, then use the Assign button to search members by name or ID.",
            ViewCount = 1240,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-12),
        },
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111102"),
            Title = "Setting up QR check-in on your kiosk",
            Category = "Hardware",
            Tags = "qr,hardware,attendance,kiosk",
            Body = "Install the Lexora Kiosk app on any tablet, sign in with a device token from Settings → API keys, and pair the kiosk to a branch.",
            ViewCount = 984,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-22),
        },
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111103"),
            Title = "Configuring shift schedules",
            Category = "Operations",
            Tags = "shifts,attendance,schedule",
            Body = "Shifts live under Attendance → Shifts. Create weekly templates with grace periods, break windows, and overflow behavior.",
            ViewCount = 726,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-32),
        },
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111104"),
            Title = "Importing bulk members from CSV",
            Category = "Data",
            Tags = "import,csv,members,bulk",
            Body = "Use the Members → Import wizard. Download the template CSV, fill required columns, and upload for validation before commit.",
            ViewCount = 612,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-40),
        },
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111105"),
            Title = "Subscription and billing setup",
            Category = "Billing",
            Tags = "billing,stripe,subscription,invoice",
            Body = "Enable billing under Settings → Institution → Billing. Connect Stripe, choose default plans, and configure tax rates.",
            ViewCount = 508,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-44),
        },
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111106"),
            Title = "Configuring WhatsApp and SMS alerts",
            Category = "Notifications",
            Tags = "notifications,whatsapp,sms,alerts",
            Body = "Add a provider under Settings → Notifications → Channels. Choose which topics route to which channel.",
            ViewCount = 421,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-48),
        },
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111107"),
            Title = "Resetting a member's password",
            Category = "Account",
            Tags = "password,reset,account,auth",
            Body = "Open the member detail drawer and click Send reset link. The member receives an email with a one-time link valid for 24 hours.",
            ViewCount = 390,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-6),
        },
        new KnowledgeBaseArticle
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111108"),
            Title = "Enabling two-factor authentication",
            Category = "Account",
            Tags = "2fa,security,mfa,auth",
            Body = "Go to Profile → Security and enable 2FA using an authenticator app. Backup codes are shown once — store them safely.",
            ViewCount = 355,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-18),
        },
    ];
}
