using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Application.Services;

public class SubscriptionService : ISubscriptionService
{
    public Task<SubscriptionResponse> CreateAsync(Guid institutionId, CreateSubscriptionRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<SubscriptionResponse?> GetByIdAsync(Guid institutionId, Guid subscriptionId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<IReadOnlyCollection<SubscriptionResponse>> GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<SubscriptionResponse> UpdateAsync(Guid institutionId, Guid subscriptionId, UpdateSubscriptionRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}
