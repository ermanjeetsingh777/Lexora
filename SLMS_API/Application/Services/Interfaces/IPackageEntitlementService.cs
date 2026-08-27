using SLMS_API.Application.Contracts.Package.Response;

namespace SLMS_API.Application.Services.Interfaces;

public interface IPackageEntitlementService
{
    Task<OrganizationEntitlementsResponse> GetEntitlementsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task EnsureCanCreateInstitutionAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default);

    Task EnsureCanCreateBranchAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default);

    Task EnsureCanCreateLibraryAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default);
}
