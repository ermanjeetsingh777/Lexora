using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;

namespace SLMS_API.Application.Services.Interfaces
{
    public interface IPackageService
    {
        Task<IReadOnlyCollection<PackageResponse>> GetAllAsync(CancellationToken cancellationToken = default);
        Task<PackageResponse?> GetByIdAsync(Guid packageId, CancellationToken cancellationToken = default);

        Task<PackageResponse> CreateAsync(CreatePackageRequest request, string? userId, CancellationToken cancellationToken = default);

        Task<PackageResponse> UpdateAsync(Guid packageId, UpdatePackageRequest request, string? userId, CancellationToken cancellationToken = default);

        Task DeleteAsync(Guid packageId, string? userId, CancellationToken cancellationToken = default);
    }
}
