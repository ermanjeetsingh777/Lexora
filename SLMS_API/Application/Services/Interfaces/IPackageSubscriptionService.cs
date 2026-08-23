using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Contracts.PackageSubscription;

namespace SLMS_API.Application.Services.Interfaces;

public interface IPackageSubscriptionService
{
    Task<PackageSubscriptionOverviewResponse> GetOverviewAsync(string userId, CancellationToken cancellationToken = default);

    Task<PackageSubscriptionQuoteResponse> GetQuoteAsync(
        string actorUserId,
        Guid subscriptionId,
        Guid packageId,
        bool forUpgrade,
        CancellationToken cancellationToken = default);

    Task<PackageSubscriptionItemResponse> RenewAsync(string actorUserId, RenewPackageSubscriptionRequest request, CancellationToken cancellationToken = default);

    Task<PackageSubscriptionItemResponse> UpdateAsync(string actorUserId, Guid subscriptionId, UpdatePackageSubscriptionRequest request, CancellationToken cancellationToken = default);

    Task<UserPackageResponse> SubscribeAsync(string userId, SubscribePackageRequest request, CancellationToken cancellationToken = default);

    Task<UserPackageResponse> UpgradeAsync(string actorUserId, UpgradePackageRequest request, CancellationToken cancellationToken = default);
}
