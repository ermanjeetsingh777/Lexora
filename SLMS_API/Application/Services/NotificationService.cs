using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;

    public NotificationService(ApplicationDbContext db)
    {
        _db = db;
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
