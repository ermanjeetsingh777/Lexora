using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;

namespace SLMS_API.Application.Services.Interfaces
{
    public interface IUserPackageService
    {
        Task<UserPackageResponse?> GetCurrentPackageAsync( string userId, CancellationToken cancellationToken = default);
        Task<IReadOnlyCollection<UserPackageResponse>> GetHistoryAsync( string userId,CancellationToken cancellationToken = default);
        Task<UserPackageResponse> SubscribeAsync(string userId, SubscribePackageRequest request, CancellationToken cancellationToken = default);

        Task<UserPackageResponse> UpgradeAsync( string userId, UpgradePackageRequest request, CancellationToken cancellationToken = default);

        Task CancelAsync(string userId, CancellationToken cancellationToken = default);
    }
}
