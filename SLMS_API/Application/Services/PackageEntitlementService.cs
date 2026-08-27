using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class PackageEntitlementService : IPackageEntitlementService
{
    private enum OrganizationPackageTier
    {
        Basic,
        Value,
        Premium
    }

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public PackageEntitlementService(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    public async Task<OrganizationEntitlementsResponse> GetEntitlementsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken))
        {
            var superCounts = await GetCountsAsync(userId, cancellationToken);
            return BuildResponse(
                packageCode: null,
                packageName: null,
                tier: OrganizationPackageTier.Premium,
                counts: superCounts,
                isSuperAdmin: true);
        }

        var (code, name, tier) = await ResolvePackageAsync(userId, cancellationToken);
        var counts = await GetCountsAsync(userId, cancellationToken);
        return BuildResponse(code, name, tier, counts, isSuperAdmin: false);
    }

    public Task EnsureCanCreateInstitutionAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default)
        => EnsureCanCreateAsync(
            userId,
            isOnboarding,
            OrganizationResource.Institution,
            cancellationToken);

    public Task EnsureCanCreateBranchAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default)
        => EnsureCanCreateAsync(
            userId,
            isOnboarding,
            OrganizationResource.Branch,
            cancellationToken);

    public Task EnsureCanCreateLibraryAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default)
        => EnsureCanCreateAsync(
            userId,
            isOnboarding,
            OrganizationResource.Library,
            cancellationToken);

    private async Task EnsureCanCreateAsync(
        string userId,
        bool isOnboarding,
        OrganizationResource resource,
        CancellationToken cancellationToken)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken))
        {
            return;
        }

        var counts = await GetCountsAsync(userId, cancellationToken);
        if (isOnboarding && GetCount(counts, resource) == 0)
        {
            return;
        }

        var (_, _, tier) = await ResolvePackageAsync(userId, cancellationToken);
        if (CanCreate(tier, resource))
        {
            return;
        }

        throw new InvalidOperationException(GetUpgradeMessage(resource, tier));
    }

    private static bool CanCreate(OrganizationPackageTier tier, OrganizationResource resource) =>
        resource switch
        {
            OrganizationResource.Institution => tier == OrganizationPackageTier.Premium,
            OrganizationResource.Branch => tier == OrganizationPackageTier.Premium,
            OrganizationResource.Library => tier is OrganizationPackageTier.Value or OrganizationPackageTier.Premium,
            _ => false
        };

    private static string GetUpgradeMessage(OrganizationResource resource, OrganizationPackageTier tier) =>
        resource switch
        {
            OrganizationResource.Institution =>
                "Your current package does not allow creating additional institutions. Upgrade to Premium for unlimited institutions.",
            OrganizationResource.Branch =>
                "Your current package does not allow creating additional branches. Upgrade to Premium for unlimited branches.",
            OrganizationResource.Library when tier == OrganizationPackageTier.Basic =>
                "Your Basic package includes one library only. Upgrade to Value for unlimited libraries or Premium for unlimited institutions, branches, and libraries.",
            OrganizationResource.Library =>
                "Your current package does not allow creating additional libraries. Upgrade to Value or Premium.",
            _ => "Your current package does not allow this action."
        };

    private static OrganizationEntitlementsResponse BuildResponse(
        string? packageCode,
        string? packageName,
        OrganizationPackageTier tier,
        OrganizationCounts counts,
        bool isSuperAdmin)
    {
        return new OrganizationEntitlementsResponse
        {
            PackageCode = packageCode,
            PackageName = packageName,
            PackageTier = tier.ToString(),
            InstitutionCount = counts.Institutions,
            BranchCount = counts.Branches,
            LibraryCount = counts.Libraries,
            IsSuperAdmin = isSuperAdmin,
            CanCreateInstitution = isSuperAdmin || CanCreate(tier, OrganizationResource.Institution),
            CanCreateBranch = isSuperAdmin || CanCreate(tier, OrganizationResource.Branch),
            CanCreateLibrary = isSuperAdmin || CanCreate(tier, OrganizationResource.Library),
        };
    }

    private async Task<(string? Code, string? Name, OrganizationPackageTier Tier)> ResolvePackageAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var userPackage = await _db.UserPackages
            .Include(x => x.Package)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.IsCurrentPackage, cancellationToken);

        if (userPackage?.Package is null || userPackage.EndDateUtc <= DateTime.UtcNow)
        {
            return (PackageCodes.Basic, "Basic", OrganizationPackageTier.Basic);
        }

        var code = userPackage.Package.Code;
        var tier = MapTier(code);
        return (code, userPackage.Package.Name, tier);
    }

    private static OrganizationPackageTier MapTier(string? packageCode) =>
        packageCode switch
        {
            PackageCodes.Premium or PackageCodes.Trial => OrganizationPackageTier.Premium,
            PackageCodes.Value => OrganizationPackageTier.Value,
            _ => OrganizationPackageTier.Basic
        };

    private async Task<OrganizationCounts> GetCountsAsync(string userId, CancellationToken cancellationToken)
    {
        var institutions = await _db.UserInstitutions
            .AsNoTracking()
            .CountAsync(x => x.UserId == userId && x.IsActive, cancellationToken);

        var branches = await _db.UserBranches
            .AsNoTracking()
            .CountAsync(x => x.UserId == userId && x.IsActive, cancellationToken);

        var libraries = await _db.UserLibraries
            .AsNoTracking()
            .CountAsync(x => x.UserId == userId && x.IsActive, cancellationToken);

        return new OrganizationCounts(institutions, branches, libraries);
    }

    private async Task<bool> IsSuperAdminAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        return user is not null && await _userManager.IsInRoleAsync(user, RoleDefinitions.SuperAdmin);
    }

    private static int GetCount(OrganizationCounts counts, OrganizationResource resource) =>
        resource switch
        {
            OrganizationResource.Institution => counts.Institutions,
            OrganizationResource.Branch => counts.Branches,
            OrganizationResource.Library => counts.Libraries,
            _ => 0
        };

    private enum OrganizationResource
    {
        Institution,
        Branch,
        Library
    }

    private sealed record OrganizationCounts(int Institutions, int Branches, int Libraries);
}
