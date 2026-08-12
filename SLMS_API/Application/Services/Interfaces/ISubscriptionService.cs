using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface ISubscriptionService
{
    Task<IReadOnlyCollection<SubscriptionResponse>> GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken = default);
    Task<SubscriptionResponse> CreateAsync(Guid institutionId, CreateSubscriptionRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<SubscriptionResponse?> GetByIdAsync(Guid institutionId, Guid subscriptionId, CancellationToken cancellationToken = default);
    Task<SubscriptionResponse> UpdateAsync(Guid institutionId, Guid subscriptionId, UpdateSubscriptionRequest request, string? userId, CancellationToken cancellationToken = default);
}
