using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Contracts.PackageSubscription;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class PackageSubscriptionService : IPackageSubscriptionService
{
    private const int ExpiringSoonDays = 7;

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPackageService _packageService;
    private readonly IUserPackageService _userPackageService;

    public PackageSubscriptionService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IPackageService packageService,
        IUserPackageService userPackageService)
    {
        _db = db;
        _userManager = userManager;
        _packageService = packageService;
        _userPackageService = userPackageService;
    }

    public async Task<PackageSubscriptionOverviewResponse> GetOverviewAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var isSuperAdmin = await IsSuperAdminAsync(userId, cancellationToken);
        var availablePackages = await _packageService.GetAllAsync(cancellationToken);

        IQueryable<UserPackage> query = _db.UserPackages
            .Include(x => x.Package)
                .ThenInclude(p => p.Features)
            .Include(x => x.User)
            .AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(x => x.UserId == userId);
        }

        var allRecords = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var institutionMap = await LoadInstitutionMapAsync(
            allRecords.Select(x => x.UserId).Distinct().ToList(),
            cancellationToken);

        var mapped = allRecords
            .Select(x => MapItem(x, institutionMap))
            .ToList();

        var currentSubscriptions = mapped
            .Where(x => x.IsCurrentPackage)
            .ToList();

        var now = DateTime.UtcNow;
        var expiringThreshold = now.AddDays(ExpiringSoonDays);

        var expiringSoon = currentSubscriptions
            .Where(x => x.EndDateUtc > now && x.EndDateUtc <= expiringThreshold)
            .OrderBy(x => x.EndDateUtc)
            .ToList();

        var expired = currentSubscriptions
            .Where(x => x.EndDateUtc <= now)
            .OrderByDescending(x => x.EndDateUtc)
            .ToList();

        var activeCount = currentSubscriptions.Count(x =>
            x.EndDateUtc > now);

        var history = mapped
            .Select(x => new PackageSubscriptionHistoryItemResponse
            {
                Id = x.Id,
                UserId = x.UserId,
                UserName = x.UserName,
                UserEmail = x.UserEmail,
                InstitutionId = x.InstitutionId,
                InstitutionName = x.InstitutionName,
                PackageId = x.PackageId,
                PackageName = x.PackageName,
                PackageCode = x.PackageCode,
                PackageCategory = x.PackageCategory,
                PackagePrice = x.PackagePrice,
                AmountPaid = x.AmountPaid,
                AdjustmentAmount = x.AdjustmentAmount,
                DurationInDays = x.DurationInDays,
                StartDateUtc = x.StartDateUtc,
                EndDateUtc = x.EndDateUtc,
                AutoRenew = x.AutoRenew,
                IsCurrentPackage = x.IsCurrentPackage,
                IsActive = x.IsActive,
                PaymentStatus = x.PaymentStatus,
                Status = x.Status,
                DaysRemaining = x.DaysRemaining,
                CanRenew = x.CanRenew,
                CanUpgrade = x.CanUpgrade,
                CreatedAtUtc = x.CreatedAtUtc,
                Features = x.Features,
                Action = DeriveHistoryAction(x),
            })
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(100)
            .ToList();

        var ownCurrent = currentSubscriptions.FirstOrDefault(x => x.UserId == userId);

        return new PackageSubscriptionOverviewResponse
        {
            IsSuperAdmin = isSuperAdmin,
            Summary = new PackageSubscriptionSummaryResponse
            {
                TotalActive = activeCount,
                ExpiringSoonCount = expiringSoon.Count,
                ExpiredCount = expired.Count,
                TotalRevenue = mapped.Sum(x => x.AmountPaid),
            },
            CurrentSubscription = ownCurrent,
            ActiveSubscriptions = isSuperAdmin
                ? currentSubscriptions.OrderByDescending(x => x.CreatedAtUtc).ToList()
                : ownCurrent is null ? [] : [ownCurrent],
            ExpiringSoon = expiringSoon,
            Expired = expired,
            History = history,
            AvailablePackages = availablePackages.Where(x => x.IsActive).ToList(),
        };
    }

    public async Task<PackageSubscriptionQuoteResponse> GetQuoteAsync(
        string actorUserId,
        Guid subscriptionId,
        Guid packageId,
        bool forUpgrade,
        CancellationToken cancellationToken = default)
    {
        var isSuperAdmin = await IsSuperAdminAsync(actorUserId, cancellationToken);

        var current = await _db.UserPackages
            .Include(x => x.Package)
            .FirstOrDefaultAsync(x => x.Id == subscriptionId, cancellationToken)
            ?? throw new KeyNotFoundException("Subscription not found.");

        if (!isSuperAdmin && current.UserId != actorUserId)
        {
            throw new UnauthorizedAccessException("You can only quote your own subscription.");
        }

        var targetPackage = await _db.Packages
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == packageId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Package not found.");

        EnsureValidPackageSelection(current, targetPackage, forUpgrade);

        var pricing = PackageSubscriptionPricing.Calculate(current, targetPackage, DateTime.UtcNow);

        return new PackageSubscriptionQuoteResponse
        {
            SubscriptionId = current.Id,
            PackageId = targetPackage.Id,
            PackageName = targetPackage.Name,
            PackagePrice = pricing.PackagePrice,
            AdjustmentAmount = pricing.AdjustmentAmount,
            AmountPaid = pricing.AmountPaid,
            RemainingDays = pricing.RemainingDays,
            IsExpired = pricing.IsExpired,
            CurrentPackageName = current.Package.Name,
        };
    }

    public async Task<PackageSubscriptionItemResponse> RenewAsync(
        string actorUserId,
        RenewPackageSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var isSuperAdmin = await IsSuperAdminAsync(actorUserId, cancellationToken);

        var current = request.SubscriptionId.HasValue
            ? await _db.UserPackages
                .Include(x => x.Package)
                    .ThenInclude(p => p.Features)
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == request.SubscriptionId.Value, cancellationToken)
            : await _db.UserPackages
                .Include(x => x.Package)
                    .ThenInclude(p => p.Features)
                .Include(x => x.User)
                .FirstOrDefaultAsync(x =>
                    x.UserId == actorUserId &&
                    x.IsCurrentPackage,
                    cancellationToken);

        if (current is null)
        {
            throw new InvalidOperationException("No subscription found to renew.");
        }

        if (!isSuperAdmin && current.UserId != actorUserId)
        {
            throw new UnauthorizedAccessException("You can only renew your own subscription.");
        }

        var status = ComputeStatus(current.EndDateUtc, DateTime.UtcNow);
        if (status == "Active")
        {
            throw new InvalidOperationException("Renew is only available when the subscription is expiring within 7 days or has expired.");
        }

        var packageId = request.PackageId ?? current.PackageId;
        var package = await _db.Packages
            .FirstOrDefaultAsync(x => x.Id == packageId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Package not found.");

        EnsureValidPackageSelection(current, package, forUpgrade: false);

        var pricing = PackageSubscriptionPricing.Calculate(current, package, DateTime.UtcNow);

        current.IsCurrentPackage = false;
        current.UpdatedAtUtc = DateTime.UtcNow;

        var start = current.EndDateUtc > DateTime.UtcNow
            ? current.EndDateUtc
            : DateTime.UtcNow;

        var renewed = new UserPackage
        {
            UserId = current.UserId,
            PackageId = package.Id,
            StartDateUtc = start,
            EndDateUtc = start.AddDays(package.DurationInDays),
            AmountPaid = request.AmountPaid ?? pricing.AmountPaid,
            AdjustmentAmount = request.AdjustmentAmount ?? pricing.AdjustmentAmount,
            AutoRenew = request.AutoRenew ?? current.AutoRenew,
            IsActive = true,
            IsCurrentPackage = true,
            PaymentStatus = request.PaymentStatus ?? "Paid",
            CreatedAtUtc = DateTime.UtcNow,
        };

        _db.UserPackages.Add(renewed);
        await _db.SaveChangesAsync(cancellationToken);

        renewed.Package = package;
        renewed.User = current.User;

        var institutionMap = await LoadInstitutionMapAsync([renewed.UserId], cancellationToken);
        return MapItem(renewed, institutionMap);
    }

    public async Task<PackageSubscriptionItemResponse> UpdateAsync(
        string actorUserId,
        Guid subscriptionId,
        UpdatePackageSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var isSuperAdmin = await IsSuperAdminAsync(actorUserId, cancellationToken);

        var subscription = await _db.UserPackages
            .Include(x => x.Package)
                .ThenInclude(p => p.Features)
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == subscriptionId, cancellationToken)
            ?? throw new KeyNotFoundException("Subscription not found.");

        if (!isSuperAdmin && subscription.UserId != actorUserId)
        {
            throw new UnauthorizedAccessException("You can only update your own subscription.");
        }

        if (request.PackageId.HasValue && request.PackageId.Value != subscription.PackageId)
        {
            var package = await _db.Packages
                .FirstOrDefaultAsync(x => x.Id == request.PackageId.Value && x.IsActive, cancellationToken)
                ?? throw new InvalidOperationException("Package not found.");

            var pricing = PackageSubscriptionPricing.Calculate(subscription, package, DateTime.UtcNow);

            subscription.PackageId = package.Id;
            subscription.Package = package;
            subscription.AmountPaid = request.AmountPaid ?? pricing.AmountPaid;
            subscription.AdjustmentAmount = request.AdjustmentAmount ?? pricing.AdjustmentAmount;
            subscription.EndDateUtc = DateTime.UtcNow.AddDays(package.DurationInDays);
        }
        else if (request.PackageId.HasValue)
        {
            var package = await _db.Packages
                .FirstOrDefaultAsync(x => x.Id == request.PackageId.Value && x.IsActive, cancellationToken)
                ?? throw new InvalidOperationException("Package not found.");

            subscription.PackageId = package.Id;
            subscription.Package = package;
        }

        if (request.EndDateUtc.HasValue)
        {
            subscription.EndDateUtc = request.EndDateUtc.Value;
        }

        if (request.AmountPaid.HasValue && !request.PackageId.HasValue)
        {
            subscription.AmountPaid = request.AmountPaid.Value;
        }

        if (request.AdjustmentAmount.HasValue && !request.PackageId.HasValue)
        {
            subscription.AdjustmentAmount = request.AdjustmentAmount.Value;
        }

        if (request.AutoRenew.HasValue)
        {
            subscription.AutoRenew = request.AutoRenew.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.PaymentStatus))
        {
            subscription.PaymentStatus = request.PaymentStatus;
        }

        subscription.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var institutionMap = await LoadInstitutionMapAsync([subscription.UserId], cancellationToken);
        return MapItem(subscription, institutionMap);
    }

    public Task<UserPackageResponse> SubscribeAsync(
        string userId,
        SubscribePackageRequest request,
        CancellationToken cancellationToken = default)
        => _userPackageService.SubscribeAsync(userId, request, cancellationToken);

    public async Task<UserPackageResponse> UpgradeAsync(
        string actorUserId,
        UpgradePackageRequest request,
        CancellationToken cancellationToken = default)
    {
        var isSuperAdmin = await IsSuperAdminAsync(actorUserId, cancellationToken);

        var currentPackage = request.SubscriptionId.HasValue
            ? await _db.UserPackages
                .Include(x => x.Package)
                .FirstOrDefaultAsync(x => x.Id == request.SubscriptionId.Value, cancellationToken)
            : await _db.UserPackages
                .Include(x => x.Package)
                .FirstOrDefaultAsync(x =>
                    x.UserId == actorUserId &&
                    x.IsCurrentPackage,
                    cancellationToken);

        if (currentPackage is null)
        {
            throw new InvalidOperationException("Active package not found.");
        }

        if (!isSuperAdmin && currentPackage.UserId != actorUserId)
        {
            throw new UnauthorizedAccessException("You can only upgrade your own subscription.");
        }

        var status = ComputeStatus(currentPackage.EndDateUtc, DateTime.UtcNow);
        if (status is not "Active")
        {
            throw new InvalidOperationException("Upgrade is only available for active subscriptions. Please renew instead.");
        }

        var newPackage = await _db.Packages
            .FirstOrDefaultAsync(x => x.Id == request.NewPackageId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Package not found.");

        EnsureValidPackageSelection(currentPackage, newPackage, forUpgrade: true);

        var pricing = PackageSubscriptionPricing.Calculate(currentPackage, newPackage, DateTime.UtcNow);

        currentPackage.IsCurrentPackage = false;
        currentPackage.UpdatedAtUtc = DateTime.UtcNow;

        var upgradedPackage = new UserPackage
        {
            UserId = currentPackage.UserId,
            PackageId = newPackage.Id,
            StartDateUtc = DateTime.UtcNow,
            EndDateUtc = DateTime.UtcNow.AddDays(newPackage.DurationInDays),
            AutoRenew = request.AutoRenew,
            AmountPaid = pricing.AmountPaid,
            AdjustmentAmount = pricing.AdjustmentAmount,
            PaymentStatus = "Paid",
            IsActive = true,
            IsCurrentPackage = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

        _db.UserPackages.Add(upgradedPackage);
        await _db.SaveChangesAsync(cancellationToken);

        upgradedPackage.Package = newPackage;

        return new UserPackageResponse
        {
            Id = upgradedPackage.Id,
            UserId = upgradedPackage.UserId,
            PackageId = upgradedPackage.PackageId,
            PackageName = newPackage.Name,
            Price = upgradedPackage.AmountPaid,
            StartDateUtc = upgradedPackage.StartDateUtc,
            EndDateUtc = upgradedPackage.EndDateUtc,
            AutoRenew = upgradedPackage.AutoRenew,
            IsCurrentPackage = upgradedPackage.IsCurrentPackage,
            PaymentStatus = upgradedPackage.PaymentStatus,
        };
    }

    private async Task<bool> IsSuperAdminAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        return user is not null &&
               await _userManager.IsInRoleAsync(user, RoleDefinitions.SuperAdmin);
    }

    private async Task<Dictionary<string, (Guid InstitutionId, string Name)>> LoadInstitutionMapAsync(
        IReadOnlyCollection<string> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<string, (Guid, string)>();
        }

        var rows = await _db.UserInstitutions
            .Include(x => x.Institution)
            .AsNoTracking()
            .Where(x => userIds.Contains(x.UserId) && x.IsActive)
            .OrderByDescending(x => x.IsPrimary)
            .ThenByDescending(x => x.AssignedAtUtc)
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.UserId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var row = g.First();
                    return (row.InstitutionId, row.Institution.Name);
                });
    }

    private static PackageSubscriptionItemResponse MapItem(
        UserPackage userPackage,
        IReadOnlyDictionary<string, (Guid InstitutionId, string Name)> institutionMap)
    {
        var now = DateTime.UtcNow;
        var daysRemaining = (int)Math.Ceiling((userPackage.EndDateUtc - now).TotalDays);
        var status = ComputeStatus(userPackage.EndDateUtc, now);
        Guid? institutionId = null;
        string? institutionName = null;
        if (institutionMap.TryGetValue(userPackage.UserId, out var institution))
        {
            institutionId = institution.InstitutionId;
            institutionName = institution.Name;
        }

        return new PackageSubscriptionItemResponse
        {
            Id = userPackage.Id,
            UserId = userPackage.UserId,
            UserName = userPackage.User?.FullName ?? userPackage.User?.Email ?? userPackage.UserId,
            UserEmail = userPackage.User?.Email ?? string.Empty,
            InstitutionId = institutionId,
            InstitutionName = institutionName,
            PackageId = userPackage.PackageId,
            PackageName = userPackage.Package.Name,
            PackageCode = userPackage.Package.Code,
            PackageCategory = userPackage.Package.Category,
            PackagePrice = userPackage.Package.Price,
            AmountPaid = userPackage.AmountPaid,
            AdjustmentAmount = userPackage.AdjustmentAmount,
            DurationInDays = userPackage.Package.DurationInDays,
            StartDateUtc = userPackage.StartDateUtc,
            EndDateUtc = userPackage.EndDateUtc,
            AutoRenew = userPackage.AutoRenew,
            IsCurrentPackage = userPackage.IsCurrentPackage,
            IsActive = userPackage.IsActive,
            PaymentStatus = userPackage.PaymentStatus,
            Status = status,
            DaysRemaining = daysRemaining,
            CanRenew = userPackage.IsCurrentPackage && status is "Expired" or "ExpiringSoon",
            CanUpgrade = userPackage.IsCurrentPackage && status == "Active",
            CreatedAtUtc = userPackage.CreatedAtUtc,
            Features = userPackage.Package.Features
                .Select(f => new PackageFeatureResponse
                {
                    Id = f.Id,
                    FeatureName = f.FeatureName,
                    FeatureValue = f.FeatureValue,
                })
                .ToList(),
        };
    }

    private static void EnsureValidPackageSelection(UserPackage current, Package target, bool forUpgrade)
    {
        var currentPrice = current.Package.Price;

        if (forUpgrade)
        {
            if (target.Price <= currentPrice)
            {
                throw new InvalidOperationException("Upgrade requires a higher-priced plan.");
            }

            return;
        }

        if (target.Price < currentPrice)
        {
            throw new InvalidOperationException("Renew cannot select a lower-priced plan.");
        }
    }

    private static string ComputeStatus(DateTime endDateUtc, DateTime now)
    {
        if (endDateUtc <= now)
        {
            return "Expired";
        }

        if (endDateUtc <= now.AddDays(ExpiringSoonDays))
        {
            return "ExpiringSoon";
        }

        return "Active";
    }

    private static string DeriveHistoryAction(PackageSubscriptionItemResponse item)
    {
        if (item.IsCurrentPackage && item.Status is "Active" or "ExpiringSoon")
        {
            return "Current";
        }

        if (item.Status == "Expired" && item.IsCurrentPackage)
        {
            return "Expired";
        }

        return item.IsCurrentPackage ? "Renewed" : "Previous";
    }
}
