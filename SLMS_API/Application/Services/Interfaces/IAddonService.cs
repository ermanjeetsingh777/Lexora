using SLMS_API.Application.Contracts.Addon;

namespace SLMS_API.Application.Services.Interfaces
{
    public interface IAddonService
    {
        Task<IReadOnlyCollection<AddonResponse>> GetAllAsync(CancellationToken cancellationToken = default);
        Task<IReadOnlyCollection<AddonResponse>> GetActiveAsync(CancellationToken cancellationToken = default);
        Task<AddonResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<AddonResponse> CreateAsync(CreateAddonRequest request, string? userId, CancellationToken cancellationToken = default);
        Task<AddonResponse> UpdateAsync(Guid id, UpdateAddonRequest request, string? userId, CancellationToken cancellationToken = default);
        Task DeleteAsync(Guid id, string? userId, CancellationToken cancellationToken = default);
        Task<UserAddonResponse> PurchaseAddonAsync(PurchaseAddonRequest request, string userId, CancellationToken cancellationToken = default);
        Task<IReadOnlyCollection<UserAddonResponse>> GetUserAddonsAsync(string userId, CancellationToken cancellationToken = default);
    }
}
