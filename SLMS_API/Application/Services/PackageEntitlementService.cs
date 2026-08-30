using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SLMS_API.Application.Contracts.Addon;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class PackageEntitlementService : IPackageEntitlementService
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<PackageEntitlementService> _logger;

    public PackageEntitlementService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        ILogger<PackageEntitlementService> logger)
    {
        _db = db;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<OrganizationEntitlementsResponse> GetEntitlementsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(userId) && await IsSuperAdminAsync(userId, cancellationToken))
            {
                var superCounts = await GetCountsAsync(userId, cancellationToken);
                return new OrganizationEntitlementsResponse
                {
                    PackageCode = "SuperAdmin",
                    PackageName = "SuperAdmin Unlimited",
                    PackageTier = "Premium",
                    IsSuperAdmin = true,
                    InstitutionCount = superCounts.Institutions,
                    MaxInstitutions = 9999,
                    CanCreateInstitution = true,
                    BranchCount = superCounts.Branches,
                    MaxBranches = 9999,
                    CanCreateBranch = true,
                    LibraryCount = superCounts.Libraries,
                    MaxLibraries = 9999,
                    CanCreateLibrary = true,
                    UserCount = superCounts.Users,
                    MaxUsers = 9999,
                    CanCreateUser = true,
                    MemberCount = superCounts.Members,
                    MaxMembers = 999999,
                    CanCreateMember = true,
                    ActiveAddons = []
                };
            }

            var (pkg, activeAddons) = await ResolvePackageAndAddonsAsync(userId, cancellationToken);
            var limits = CalculateTotalLimits(pkg, activeAddons);
            var counts = await GetCountsAsync(userId, cancellationToken);

            return new OrganizationEntitlementsResponse
            {
                PackageCode = pkg.Code,
                PackageName = pkg.Name,
                PackageTier = pkg.Code,
                IsSuperAdmin = false,
                InstitutionCount = counts.Institutions,
                MaxInstitutions = limits.MaxInstitutions,
                CanCreateInstitution = counts.Institutions < limits.MaxInstitutions,
                BranchCount = counts.Branches,
                MaxBranches = limits.MaxBranches,
                CanCreateBranch = counts.Branches < limits.MaxBranches,
                LibraryCount = counts.Libraries,
                MaxLibraries = limits.MaxLibraries,
                CanCreateLibrary = counts.Libraries < limits.MaxLibraries,
                UserCount = counts.Users,
                MaxUsers = limits.MaxUsers,
                CanCreateUser = counts.Users < limits.MaxUsers,
                MemberCount = counts.Members,
                MaxMembers = limits.MaxMembers,
                CanCreateMember = counts.Members < limits.MaxMembers,
                ActiveAddons = activeAddons.Select(a => new UserAddonResponse
                {
                    Id = a.Id,
                    AddonId = a.AddonId,
                    AddonName = a.Addon?.Name ?? "Addon",
                    AddonCode = a.Addon?.Code ?? "",
                    ResourceType = a.Addon?.ResourceType ?? "",
                    Quantity = a.Quantity,
                    TotalExtraQuantity = a.TotalExtraQuantity,
                    AmountPaid = a.AmountPaid,
                    StartDateUtc = a.StartDateUtc,
                    EndDateUtc = a.EndDateUtc,
                    PaymentStatus = a.PaymentStatus,
                    IsActive = a.IsActive
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting entitlements for user '{UserId}'. Falling back to safe Basic defaults.", userId);
            return new OrganizationEntitlementsResponse
            {
                PackageCode = PackageCodes.Basic,
                PackageName = "Basic",
                PackageTier = PackageCodes.Basic,
                IsSuperAdmin = false,
                InstitutionCount = 0,
                MaxInstitutions = 1,
                CanCreateInstitution = true,
                BranchCount = 0,
                MaxBranches = 1,
                CanCreateBranch = true,
                LibraryCount = 0,
                MaxLibraries = 1,
                CanCreateLibrary = true,
                UserCount = 1,
                MaxUsers = 2,
                CanCreateUser = true,
                MemberCount = 0,
                MaxMembers = 200,
                CanCreateMember = true,
                ActiveAddons = []
            };
        }
    }

    public async Task EnsureCanCreateInstitutionAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken)) return;

        var counts = await GetCountsAsync(userId, cancellationToken);
        if (isOnboarding && counts.Institutions == 0) return;

        var (pkg, activeAddons) = await ResolvePackageAndAddonsAsync(userId, cancellationToken);
        var limits = CalculateTotalLimits(pkg, activeAddons);

        if (counts.Institutions >= limits.MaxInstitutions)
        {
            throw new InvalidOperationException(
                $"Your {pkg.Name} package allows up to {limits.MaxInstitutions} active institution(s) (current: {counts.Institutions}). " +
                "Please upgrade your package or purchase an Institution Add-on.");
        }
    }

    public async Task EnsureCanCreateBranchAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken)) return;

        var counts = await GetCountsAsync(userId, cancellationToken);
        if (isOnboarding && counts.Branches == 0) return;

        var (pkg, activeAddons) = await ResolvePackageAndAddonsAsync(userId, cancellationToken);
        var limits = CalculateTotalLimits(pkg, activeAddons);

        if (counts.Branches >= limits.MaxBranches)
        {
            throw new InvalidOperationException(
                $"Your {pkg.Name} package allows up to {limits.MaxBranches} active branch(es) (current: {counts.Branches}). " +
                "Please upgrade your package or purchase a Branch Add-on.");
        }
    }

    public async Task EnsureCanCreateLibraryAsync(
        string userId,
        bool isOnboarding,
        CancellationToken cancellationToken = default)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken)) return;

        var counts = await GetCountsAsync(userId, cancellationToken);
        if (isOnboarding && counts.Libraries == 0) return;

        var (pkg, activeAddons) = await ResolvePackageAndAddonsAsync(userId, cancellationToken);
        var limits = CalculateTotalLimits(pkg, activeAddons);

        if (counts.Libraries >= limits.MaxLibraries)
        {
            throw new InvalidOperationException(
                $"Your {pkg.Name} package allows up to {limits.MaxLibraries} active library/libraries (current: {counts.Libraries}). " +
                "Please upgrade your package or purchase a Library Add-on.");
        }
    }

    public async Task EnsureCanCreateUserAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken)) return;

        var counts = await GetCountsAsync(userId, cancellationToken);
        var (pkg, activeAddons) = await ResolvePackageAndAddonsAsync(userId, cancellationToken);
        var limits = CalculateTotalLimits(pkg, activeAddons);

        if (counts.Users >= limits.MaxUsers)
        {
            throw new InvalidOperationException(
                $"Your {pkg.Name} package allows up to {limits.MaxUsers} active staff user(s) (current: {counts.Users}). " +
                "Please upgrade your package or purchase an Additional User Add-on.");
        }
    }

    public async Task EnsureCanCreateMemberAsync(
        string userId,
        int countToAdd = 1,
        CancellationToken cancellationToken = default)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken)) return;

        var counts = await GetCountsAsync(userId, cancellationToken);
        var (pkg, activeAddons) = await ResolvePackageAndAddonsAsync(userId, cancellationToken);
        var limits = CalculateTotalLimits(pkg, activeAddons);

        if (counts.Members + countToAdd > limits.MaxMembers)
        {
            throw new InvalidOperationException(
                $"Your {pkg.Name} package allows up to {limits.MaxMembers} active member(s) (current active: {counts.Members}, attempting to add: {countToAdd}). " +
                "Please upgrade your package or purchase a Member Capacity Add-on.");
        }
    }

    private static PackageLimits CalculateTotalLimits(Package package, List<UserPackageAddon> addons)
    {
        var extraInstitutions = addons
            .Where(a => string.Equals(a.Addon?.ResourceType, "Institution", StringComparison.OrdinalIgnoreCase))
            .Sum(a => a.TotalExtraQuantity);

        var extraBranches = addons
            .Where(a => string.Equals(a.Addon?.ResourceType, "Branch", StringComparison.OrdinalIgnoreCase))
            .Sum(a => a.TotalExtraQuantity);

        var extraLibraries = addons
            .Where(a => string.Equals(a.Addon?.ResourceType, "Library", StringComparison.OrdinalIgnoreCase))
            .Sum(a => a.TotalExtraQuantity);

        var extraUsers = addons
            .Where(a => string.Equals(a.Addon?.ResourceType, "User", StringComparison.OrdinalIgnoreCase))
            .Sum(a => a.TotalExtraQuantity);

        var extraMembers = addons
            .Where(a => string.Equals(a.Addon?.ResourceType, "Member", StringComparison.OrdinalIgnoreCase))
            .Sum(a => a.TotalExtraQuantity);

        return new PackageLimits(
            MaxInstitutions: package.MaxInstitutions + extraInstitutions,
            MaxBranches: package.MaxBranches + extraBranches,
            MaxLibraries: package.MaxLibraries + extraLibraries,
            MaxUsers: package.MaxUsers + extraUsers,
            MaxMembers: package.MaxMembers + extraMembers
        );
    }

    private async Task<(Package Package, List<UserPackageAddon> ActiveAddons)> ResolvePackageAndAddonsAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var userPackage = await _db.UserPackages
            .Include(x => x.Package)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.IsCurrentPackage && x.IsActive, cancellationToken);

        Package package;
        if (userPackage?.Package is not null && userPackage.EndDateUtc > DateTime.UtcNow)
        {
            package = userPackage.Package;
        }
        else
        {
            // Default to Basic Package from DB
            var basic = await _db.Packages.AsNoTracking().FirstOrDefaultAsync(p => p.Code == PackageCodes.Basic, cancellationToken);
            package = basic ?? new Package
            {
                Name = "Basic",
                Code = PackageCodes.Basic,
                MaxInstitutions = 1,
                MaxBranches = 1,
                MaxLibraries = 1,
                MaxUsers = 2,
                MaxMembers = 200
            };
        }

        var activeAddons = await _db.UserPackageAddons
            .Include(x => x.Addon)
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive && x.EndDateUtc > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        return (package, activeAddons);
    }

    private async Task<OrganizationCounts> GetCountsAsync(string userId, CancellationToken cancellationToken)
    {
        // 1. Active Institutions linked to user
        var userInstIds = await _db.UserInstitutions
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => x.InstitutionId)
            .ToListAsync(cancellationToken);

        var institutionsCount = userInstIds.Count;

        // 2. Active Branches linked to user
        var userBranchIds = await _db.UserBranches
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => x.BranchId)
            .ToListAsync(cancellationToken);

        var branchesCount = userBranchIds.Count;

        // 3. Active Libraries linked to user
        var userLibIds = await _db.UserLibraries
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => x.LibraryId)
            .ToListAsync(cancellationToken);

        var librariesCount = userLibIds.Count;

        // 4. Active Staff Users (Exclude Member users, only count IsActive == true)
        int usersCount = 0;
        if (userInstIds.Count > 0)
        {
            usersCount = await _db.UserInstitutions
                .AsNoTracking()
                .Where(ui => userInstIds.Contains(ui.InstitutionId) && ui.IsActive && ui.User.IsActive && ui.User.UserType != UserType.Member)
                .Select(ui => ui.UserId)
                .Distinct()
                .CountAsync(cancellationToken);
        }
        else
        {
            usersCount = 1; // Current user
        }

        // 5. Active Members (IsActive == true, IsDeleted == false)
        int membersCount = 0;
        if (userLibIds.Count > 0)
        {
            membersCount = await _db.MemberLibraries
                .AsNoTracking()
                .Where(ml => userLibIds.Contains(ml.LibraryId) && ml.IsActive && ml.Member.IsActive && !ml.Member.IsDeleted)
                .Select(ml => ml.MemberId)
                .Distinct()
                .CountAsync(cancellationToken);
        }

        return new OrganizationCounts(institutionsCount, branchesCount, librariesCount, usersCount, membersCount);
    }

    private async Task<bool> IsSuperAdminAsync(string userId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(userId)) return false;
        var user = await _userManager.FindByIdAsync(userId);
        return user is not null && await _userManager.IsInRoleAsync(user, RoleDefinitions.SuperAdmin);
    }

    private sealed record PackageLimits(
        int MaxInstitutions,
        int MaxBranches,
        int MaxLibraries,
        int MaxUsers,
        int MaxMembers
    );

    private sealed record OrganizationCounts(
        int Institutions,
        int Branches,
        int Libraries,
        int Users,
        int Members
    );
}
