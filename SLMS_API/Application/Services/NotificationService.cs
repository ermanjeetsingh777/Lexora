using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        ApplicationDbContext db,
        IEmailSender emailSender,
        ILogger<NotificationService> logger)
    {
        _db = db;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<NotificationResponse> CreateAsync(
        string userId,
        NotificationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new InvalidOperationException("User is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
        {
            throw new InvalidOperationException("Title and message are required.");
        }

        var notification = new UserNotification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MemberId = request.MemberId,
            BookLoanId = request.BookLoanId,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            NotificationType = string.IsNullOrWhiteSpace(request.NotificationType) ? "general" : request.NotificationType.Trim(),
            IsRead = false,
            CreatedBy = userId,
        };

        _db.UserNotifications.Add(notification);
        await _db.SaveChangesAsync(cancellationToken);

        return Map(notification);
    }

    public async Task<IReadOnlyCollection<NotificationResponse>> GetForUserAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Array.Empty<NotificationResponse>();
        }

        var items = await _db.UserNotifications.AsNoTracking()
            .Where(n => !n.IsDeleted && n.UserId == userId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(100)
            .ToListAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    public async Task MarkAsReadAsync(
        string userId,
        Guid notificationId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _db.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId && !n.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Notification not found.");

        notification.IsRead = true;
        notification.UpdatedAtUtc = DateTime.UtcNow;
        notification.UpdatedBy = userId;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> GenerateOperationalAlertsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new InvalidOperationException("User is required.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var reminderDays = new[] { 7, 3, 1 };
        var reminderDates = reminderDays.Select(d => today.AddDays(d)).ToHashSet();
        var created = 0;

        // Exact 7 / 3 / 1 day renewal windows
        var renewals = await _db.MemberPlans.AsNoTracking()
            .Where(mp => mp.IsCurrent && !mp.IsDeleted && reminderDates.Contains(mp.EndDate))
            .Select(mp => new
            {
                mp.MemberId,
                Name = mp.Member.FullName,
                Phone = mp.Member.PhoneNumber,
                Email = mp.Member.Email ?? mp.Member.User.Email,
                mp.EndDate,
                PlanName = mp.Plan.Name,
                LibraryName = mp.Plan.Library.Name,
                mp.DueAmount,
            })
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var row in renewals)
        {
            var days = row.EndDate.DayNumber - today.DayNumber;
            var title = $"Renewal reminder · {days} day{(days == 1 ? "" : "s")}";
            var waUrl = BuildWhatsAppRenewalUrl(row.Phone, row.Name, row.PlanName, row.EndDate, row.LibraryName, row.DueAmount);
            var message = waUrl is null
                ? $"{row.Name}'s plan ({row.PlanName}) ends on {row.EndDate:dd MMM yyyy}."
                : $"{row.Name}'s plan ({row.PlanName}) ends on {row.EndDate:dd MMM yyyy}. WhatsApp: {waUrl}";

            if (await CreateIfNotDuplicateAsync(userId, title, message, "plan_expiry", row.MemberId, cancellationToken))
            {
                created++;
                await TrySendRenewalEmailAsync(
                    row.Email,
                    row.Name,
                    row.PlanName,
                    row.EndDate,
                    row.LibraryName,
                    days,
                    cancellationToken);
            }
        }

        var dues = await _db.MemberPlans.AsNoTracking()
            .Where(mp => mp.IsCurrent && !mp.IsDeleted && mp.DueAmount > 0)
            .Select(mp => new
            {
                mp.MemberId,
                Name = mp.Member.FullName,
                Phone = mp.Member.PhoneNumber,
                mp.DueAmount,
            })
            .Take(50)
            .ToListAsync(cancellationToken);

        foreach (var row in dues)
        {
            var title = "Payment due";
            var waUrl = BuildWhatsAppDueUrl(row.Phone, row.Name, row.DueAmount);
            var message = waUrl is null
                ? $"{row.Name} owes ₹{row.DueAmount:0.##}."
                : $"{row.Name} owes ₹{row.DueAmount:0.##}. WhatsApp: {waUrl}";
            if (await CreateIfNotDuplicateAsync(userId, title, message, "payment_due", row.MemberId, cancellationToken))
            {
                created++;
            }
        }

        var lateToday = await _db.MemberAttendances.AsNoTracking()
            .Where(a => a.AttendanceDate == today && !a.IsDeleted && a.Status == Common.Enums.AttendanceStatus.Late)
            .Select(a => new
            {
                a.MemberId,
                Name = a.Member.FullName,
                a.LateMinutes,
            })
            .Take(50)
            .ToListAsync(cancellationToken);

        foreach (var row in lateToday)
        {
            var title = "Late arrival today";
            var message = $"{row.Name} checked in late ({row.LateMinutes} min).";
            if (await CreateIfNotDuplicateAsync(userId, title, message, "late_alert", row.MemberId, cancellationToken))
            {
                created++;
            }
        }

        return created;
    }

    private async Task TrySendRenewalEmailAsync(
        string? email,
        string name,
        string planName,
        DateOnly endDate,
        string libraryName,
        int days,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(email) || MemberContactHelper.IsSyntheticIdentityEmail(email))
        {
            return;
        }

        try
        {
            var subject = $"Membership renewal reminder — {days} day{(days == 1 ? "" : "s")} left";
            var html = $"""
                <p>Hello {System.Net.WebUtility.HtmlEncode(name)},</p>
                <p>Your <strong>{System.Net.WebUtility.HtmlEncode(planName)}</strong> membership at
                <strong>{System.Net.WebUtility.HtmlEncode(libraryName)}</strong> ends on
                <strong>{endDate:dd MMM yyyy}</strong> ({days} day{(days == 1 ? "" : "s")} from today).</p>
                <p>Please renew to avoid interruption of access.</p>
                <p>Regards,<br/>{System.Net.WebUtility.HtmlEncode(libraryName)}</p>
                """;
            await _emailSender.SendAsync(email, subject, html, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Renewal email failed for {Email}", email);
        }
    }

    private static string? BuildWhatsAppRenewalUrl(
        string? phone,
        string name,
        string planName,
        DateOnly endDate,
        string libraryName,
        decimal dueAmount)
    {
        var digits = NormalizePhone(phone);
        if (digits is null) return null;

        var dueLine = dueAmount > 0 ? $"\nAmount due: Rs.{dueAmount:0.##}" : "";
        var text = $"""
            Membership renewal reminder

            Hello {name},

            Your {planName} plan ends on {endDate:dd MMM yyyy}.{dueLine}

            Please renew to continue using the library.

            Regards,
            {libraryName}
            """;
        return $"https://wa.me/{digits}?text={Uri.EscapeDataString(text)}";
    }

    private static string? BuildWhatsAppDueUrl(string? phone, string name, decimal dueAmount)
    {
        var digits = NormalizePhone(phone);
        if (digits is null) return null;

        var text = $"""
            Payment reminder

            Hello {name},

            Amount due: Rs.{dueAmount:0.##}

            Kindly complete payment at your earliest convenience.
            """;
        return $"https://wa.me/{digits}?text={Uri.EscapeDataString(text)}";
    }

    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 10) digits = "91" + digits;
        return digits.Length >= 10 ? digits : null;
    }

    private async Task<bool> CreateIfNotDuplicateAsync(
        string userId,
        string title,
        string message,
        string type,
        Guid? memberId,
        CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.Date;
        var exists = await _db.UserNotifications.AsNoTracking().AnyAsync(n =>
            n.UserId == userId
            && !n.IsDeleted
            && n.NotificationType == type
            && n.MemberId == memberId
            && n.CreatedAtUtc >= since,
            cancellationToken);

        if (exists) return false;

        await CreateAsync(userId, new NotificationRequest
        {
            Title = title,
            Message = message,
            NotificationType = type,
            MemberId = memberId,
        }, cancellationToken);

        return true;
    }

    private static NotificationResponse Map(UserNotification notification) => new()
    {
        Id = notification.Id,
        Title = notification.Title,
        Message = notification.Message,
        NotificationType = notification.NotificationType,
        MemberId = notification.MemberId,
        BookLoanId = notification.BookLoanId,
        IsRead = notification.IsRead,
        CreatedAtUtc = notification.CreatedAtUtc,
    };
}
