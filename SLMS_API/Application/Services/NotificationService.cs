using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Application.Services;

public class NotificationService : INotificationService
{
    public Task<NotificationResponse> CreateAsync(string userId, NotificationRequest request, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<IReadOnlyCollection<NotificationResponse>> GetForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task MarkAsReadAsync(string userId, Guid notificationId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}
