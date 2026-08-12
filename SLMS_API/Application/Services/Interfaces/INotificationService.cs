using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyCollection<NotificationResponse>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<NotificationResponse> CreateAsync(string userId, NotificationRequest request, CancellationToken cancellationToken = default);
    Task MarkAsReadAsync(string userId, Guid notificationId, CancellationToken cancellationToken = default);
}
