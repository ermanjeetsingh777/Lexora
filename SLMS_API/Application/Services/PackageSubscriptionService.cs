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
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPackageService _packageService;
    private readonly IUserPackageService _userPackageService;
    private readonly IAuditLogService _auditLogService;
    private readonly int _expiringSoonDays;

    public PackageSubscriptionService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IPackageService packageService,
        IUserPackageService userPackageService,
        IAuditLogService auditLogService,
        IConfiguration configuration)
    {
        _db = db;
        _userManager = userManager;
        _packageService = packageService;
        _userPackageService = userPackageService;
        _auditLogService = auditLogService;
        var configDays = configuration.GetValue<int>("Subscription:ExpiringSoonDays", 14);
        _expiringSoonDays = configDays > 0 ? configDays : 14;
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
        var expiringThreshold = now.AddDays(_expiringSoonDays);

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
        var pendingRequest = mapped.FirstOrDefault(x => x.UserId == userId && x.ApprovalStatus == "Pending");

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
            PendingRequest = pendingRequest,
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

        var isCurrentTrial = string.Equals(current.Package?.Code, PackageCodes.Trial, StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(current.Package?.Name, "Trial", StringComparison.OrdinalIgnoreCase) ||
                             (current.Package != null && current.Package.Price <= 0);

        if (isCurrentTrial)
        {
            forUpgrade = true;
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

        var status = ComputeStatus(current.EndDateUtc, DateTime.UtcNow, _expiringSoonDays);
        if (status == "Active" && !isSuperAdmin)
        {
            throw new InvalidOperationException($"Renew is only available when the subscription is expiring within {_expiringSoonDays} days or has expired.");
        }

        var packageId = request.PackageId ?? current.PackageId;
        var package = await _db.Packages
            .FirstOrDefaultAsync(x => x.Id == packageId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Package not found.");

        EnsureValidPackageSelection(current, package, forUpgrade: false);

        var pricing = PackageSubscriptionPricing.Calculate(current, package, DateTime.UtcNow);

        var start = current.EndDateUtc > DateTime.UtcNow
            ? current.EndDateUtc
            : DateTime.UtcNow;

        if (isSuperAdmin)
        {
            // SuperAdmin action: auto-approve immediately
            current.IsCurrentPackage = false;
            current.UpdatedAtUtc = DateTime.UtcNow;

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
                ApprovalStatus = "Approved",
                ApprovedAtUtc = DateTime.UtcNow,
                ApprovedByUserId = actorUserId,
                PaymentStatus = request.PaymentStatus ?? "Paid",
                RequestType = "Renew",
                Note = request.Note,
                TransactionId = request.TransactionId,
                PreviousPackageId = current.PackageId,
                CreatedAtUtc = DateTime.UtcNow,
            };

            _db.UserPackages.Add(renewed);
            await _db.SaveChangesAsync(cancellationToken);

            renewed.Package = package;
            renewed.User = current.User;

            var institutionMap = await LoadInstitutionMapAsync([renewed.UserId], cancellationToken);
            return MapItem(renewed, institutionMap);
        }
        else
        {
            // Regular user: submit renew request for SuperAdmin approval
            var pendingRenew = new UserPackage
            {
                UserId = current.UserId,
                PackageId = package.Id,
                StartDateUtc = start,
                EndDateUtc = start.AddDays(package.DurationInDays),
                AmountPaid = pricing.AmountPaid,
                AdjustmentAmount = pricing.AdjustmentAmount,
                AutoRenew = request.AutoRenew ?? current.AutoRenew,
                IsActive = false,
                IsCurrentPackage = false,
                ApprovalStatus = "Pending",
                PaymentStatus = "PendingApproval",
                RequestType = "Renew",
                Note = request.Note,
                TransactionId = request.TransactionId,
                PreviousPackageId = current.PackageId,
                CreatedAtUtc = DateTime.UtcNow,
            };

            _db.UserPackages.Add(pendingRenew);
            await _db.SaveChangesAsync(cancellationToken);

            pendingRenew.Package = package;
            pendingRenew.User = current.User;

            var institutionMap = await LoadInstitutionMapAsync([pendingRenew.UserId], cancellationToken);
            return MapItem(pendingRenew, institutionMap);
        }
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

        var isTrial = string.Equals(currentPackage.Package.Code, PackageCodes.Trial, StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(currentPackage.Package.Name, "Trial", StringComparison.OrdinalIgnoreCase) ||
                      currentPackage.Package.Price <= 0;

        var status = ComputeStatus(currentPackage.EndDateUtc, DateTime.UtcNow, _expiringSoonDays);
        if (status is not "Active" && !isTrial)
        {
            throw new InvalidOperationException("Upgrade is only available for active subscriptions. Please renew instead.");
        }

        var newPackage = await _db.Packages
            .FirstOrDefaultAsync(x => x.Id == request.NewPackageId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Package not found.");

        EnsureValidPackageSelection(currentPackage, newPackage, forUpgrade: true);

        var pricing = PackageSubscriptionPricing.Calculate(currentPackage, newPackage, DateTime.UtcNow);

        if (isSuperAdmin)
        {
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
                ApprovalStatus = "Approved",
                ApprovedAtUtc = DateTime.UtcNow,
                ApprovedByUserId = actorUserId,
                RequestType = "Upgrade",
                Note = request.Note,
                TransactionId = request.TransactionId,
                PreviousPackageId = currentPackage.PackageId,
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
                IsActive = upgradedPackage.IsActive,
                PaymentStatus = upgradedPackage.PaymentStatus,
                ApprovalStatus = "Approved",
                RequestType = "Upgrade",
            };
        }
        else
        {
            // Regular user: submit upgrade request for SuperAdmin approval
            var pendingUpgrade = new UserPackage
            {
                UserId = currentPackage.UserId,
                PackageId = newPackage.Id,
                StartDateUtc = DateTime.UtcNow,
                EndDateUtc = DateTime.UtcNow.AddDays(newPackage.DurationInDays),
                AutoRenew = request.AutoRenew,
                AmountPaid = pricing.AmountPaid,
                AdjustmentAmount = pricing.AdjustmentAmount,
                PaymentStatus = "PendingApproval",
                IsActive = false,
                IsCurrentPackage = false,
                ApprovalStatus = "Pending",
                RequestType = "Upgrade",
                Note = request.Note,
                TransactionId = request.TransactionId,
                PreviousPackageId = currentPackage.PackageId,
                CreatedAtUtc = DateTime.UtcNow,
            };

            _db.UserPackages.Add(pendingUpgrade);
            await _db.SaveChangesAsync(cancellationToken);

            pendingUpgrade.Package = newPackage;

            return new UserPackageResponse
            {
                Id = pendingUpgrade.Id,
                UserId = pendingUpgrade.UserId,
                PackageId = pendingUpgrade.PackageId,
                PackageName = newPackage.Name,
                Price = pendingUpgrade.AmountPaid,
                StartDateUtc = pendingUpgrade.StartDateUtc,
                EndDateUtc = pendingUpgrade.EndDateUtc,
                AutoRenew = pendingUpgrade.AutoRenew,
                IsCurrentPackage = false,
                IsActive = false,
                PaymentStatus = pendingUpgrade.PaymentStatus,
                ApprovalStatus = "Pending",
                RequestType = "Upgrade",
            };
        }
    }

    public async Task<IReadOnlyCollection<PackageSubscriptionItemResponse>> GetAllSubscriptionRequestsAsync(
        string? status,
        CancellationToken cancellationToken = default)
    {
        IQueryable<UserPackage> query = _db.UserPackages
            .Include(x => x.Package)
                .ThenInclude(p => p.Features)
            .Include(x => x.User)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.ApprovalStatus == status);
        }
        else
        {
            query = query.Where(x => x.RequestType == "Renew" || x.RequestType == "Upgrade" || x.ApprovalStatus != "Approved" || !x.IsCurrentPackage);
        }

        var list = await query.OrderByDescending(x => x.CreatedAtUtc).ToListAsync(cancellationToken);
        var institutionMap = await LoadInstitutionMapAsync(list.Select(x => x.UserId).Distinct().ToList(), cancellationToken);

        return list.Select(x => MapItem(x, institutionMap)).ToList();
    }

    public async Task<PackageSubscriptionItemResponse> ApproveSubscriptionRequestAsync(
        Guid id,
        ApproveSubscriptionRequest request,
        string approverUserId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var userPackage = await _db.UserPackages
            .Include(x => x.Package)
                .ThenInclude(p => p.Features)
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Subscription request not found.");

        if (userPackage.ApprovalStatus == "Approved")
        {
            throw new InvalidOperationException("Subscription request is already approved.");
        }

        // Deactivate previous current packages for this user
        var currentPackages = await _db.UserPackages
            .Where(x => x.UserId == userPackage.UserId && x.IsCurrentPackage && x.Id != userPackage.Id)
            .ToListAsync(cancellationToken);

        var prevPkg = currentPackages.FirstOrDefault();

        foreach (var cur in currentPackages)
        {
            cur.IsCurrentPackage = false;
            cur.UpdatedAtUtc = DateTime.UtcNow;
        }

        DateTime start;
        if (userPackage.RequestType == "Renew" && prevPkg != null && prevPkg.EndDateUtc > DateTime.UtcNow)
        {
            start = prevPkg.EndDateUtc;
        }
        else
        {
            start = DateTime.UtcNow;
        }

        userPackage.StartDateUtc = start;
        userPackage.EndDateUtc = start.AddDays(userPackage.Package.DurationInDays);
        userPackage.IsActive = true;
        userPackage.IsCurrentPackage = true;
        userPackage.ApprovalStatus = "Approved";
        userPackage.PaymentStatus = "Paid";
        userPackage.ApprovedAtUtc = DateTime.UtcNow;
        userPackage.ApprovedByUserId = approverUserId;
        userPackage.AdminRemarks = request.AdminRemarks;
        if (request.FinalApprovedAmount.HasValue)
        {
            userPackage.FinalApprovedAmount = request.FinalApprovedAmount.Value;
            userPackage.AmountPaid = request.FinalApprovedAmount.Value;
        }
        else
        {
            userPackage.FinalApprovedAmount = userPackage.AmountPaid;
        }

        userPackage.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await _auditLogService.WriteAsync(
            AuditEventTypes.SubscriptionApproval,
            approverUserId,
            $"Subscription request for package '{userPackage.Package.Name}' ({userPackage.RequestType}) approved for user '{userPackage.User?.Email ?? userPackage.UserId}'. Amount: {userPackage.FinalApprovedAmount}.",
            ipAddress,
            cancellationToken);

        var institutionMap = await LoadInstitutionMapAsync([userPackage.UserId], cancellationToken);
        return MapItem(userPackage, institutionMap);
    }

    public async Task<PackageSubscriptionItemResponse> RejectSubscriptionRequestAsync(
        Guid id,
        RejectSubscriptionRequest request,
        string approverUserId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var userPackage = await _db.UserPackages
            .Include(x => x.Package)
                .ThenInclude(p => p.Features)
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Subscription request not found.");

        if (userPackage.ApprovalStatus == "Approved")
        {
            throw new InvalidOperationException("Approved subscription request cannot be rejected.");
        }

        userPackage.ApprovalStatus = "Rejected";
        userPackage.IsActive = false;
        userPackage.IsCurrentPackage = false;
        userPackage.RejectedAtUtc = DateTime.UtcNow;
        userPackage.ApprovedByUserId = approverUserId;
        userPackage.AdminRemarks = request.AdminRemarks;
        userPackage.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await _auditLogService.WriteAsync(
            AuditEventTypes.SubscriptionApproval,
            approverUserId,
            $"Subscription request for package '{userPackage.Package.Name}' ({userPackage.RequestType}) rejected for user '{userPackage.User?.Email ?? userPackage.UserId}'. Reason: {request.AdminRemarks}.",
            ipAddress,
            cancellationToken);

        var institutionMap = await LoadInstitutionMapAsync([userPackage.UserId], cancellationToken);
        return MapItem(userPackage, institutionMap);
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

    private PackageSubscriptionItemResponse MapItem(
        UserPackage userPackage,
        IReadOnlyDictionary<string, (Guid InstitutionId, string Name)> institutionMap)
    {
        var now = DateTime.UtcNow;
        var daysRemaining = (int)Math.Ceiling((userPackage.EndDateUtc - now).TotalDays);
        var status = ComputeStatus(userPackage.EndDateUtc, now, _expiringSoonDays);
        Guid? institutionId = null;
        string? institutionName = null;
        if (institutionMap.TryGetValue(userPackage.UserId, out var institution))
        {
            institutionId = institution.InstitutionId;
            institutionName = institution.Name;
        }

        var isTrial = string.Equals(userPackage.Package.Code, PackageCodes.Trial, StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(userPackage.Package.Name, "Trial", StringComparison.OrdinalIgnoreCase) ||
                      userPackage.Package.Price <= 0;

        return new PackageSubscriptionItemResponse
        {
            Id = userPackage.Id,
            UserId = userPackage.UserId,
            UserName = userPackage.User?.FullName ?? userPackage.User?.Email ?? userPackage.UserId,
            UserEmail = userPackage.User?.Email ?? string.Empty,
            UserPhone = userPackage.User?.PhoneNumber,
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
            ApprovalStatus = userPackage.ApprovalStatus ?? "Approved",
            AdminRemarks = userPackage.AdminRemarks,
            FinalApprovedAmount = userPackage.FinalApprovedAmount,
            ApprovedAtUtc = userPackage.ApprovedAtUtc,
            RejectedAtUtc = userPackage.RejectedAtUtc,
            ApprovedBy = userPackage.ApprovedByUserId,
            RequestType = userPackage.RequestType,
            Note = userPackage.Note,
            DaysRemaining = daysRemaining,
            CanRenew = !isTrial && userPackage.IsCurrentPackage && status is "Expired" or "ExpiringSoon",
            CanUpgrade = userPackage.IsCurrentPackage && (status == "Active" || isTrial),
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
        var isCurrentTrial = string.Equals(current.Package?.Code, PackageCodes.Trial, StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(current.Package?.Name, "Trial", StringComparison.OrdinalIgnoreCase) ||
                             (current.Package != null && current.Package.Price <= 0);

        var isTargetTrial = string.Equals(target.Code, PackageCodes.Trial, StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(target.Name, "Trial", StringComparison.OrdinalIgnoreCase) ||
                            target.Price <= 0;

        if (isTargetTrial)
        {
            throw new InvalidOperationException("Trial plan cannot be chosen for renew or upgrade.");
        }

        if (!forUpgrade && isCurrentTrial)
        {
            throw new InvalidOperationException("Trial plan cannot be renewed. Please upgrade to a paid plan.");
        }

        var currentPrice = current.Package?.Price ?? 0;

        if (forUpgrade)
        {
            if (target.Price <= currentPrice && !isCurrentTrial)
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

    private static string ComputeStatus(DateTime endDateUtc, DateTime now, int expiringSoonDays)
    {
        if (endDateUtc <= now)
        {
            return "Expired";
        }

        if (endDateUtc <= now.AddDays(expiringSoonDays))
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
