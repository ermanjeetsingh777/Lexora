using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class BranchService : IBranchService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuthService _authService;
    private readonly UserManager<ApplicationUser> _userManager;

    public BranchService(
        ApplicationDbContext dbContext,
        IAuthService authService,
        UserManager<ApplicationUser> userManager)
    {
        _dbContext = dbContext;
        _authService = authService;
        _userManager = userManager;
    }

    public async Task<BranchListViewResponse> GetListViewAsync(
        BranchListQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var userIdString = userId.ToString();
        var isSuperAdmin = await IsSuperAdminAsync(userId, cancellationToken);

        var branchesQuery = _dbContext.Branches
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (!isSuperAdmin)
        {
            var accessibleInstitutionIds = await _dbContext.UserInstitutions
                .AsNoTracking()
                .Where(ui => ui.UserId == userIdString && ui.IsActive)
                .Select(ui => ui.InstitutionId)
                .ToListAsync(cancellationToken);

            var accessibleBranchIds = await _dbContext.UserBranches
                .AsNoTracking()
                .Where(ub => ub.UserId == userIdString && ub.IsActive)
                .Select(ub => ub.BranchId)
                .ToListAsync(cancellationToken);

            branchesQuery = branchesQuery.Where(x =>
                accessibleInstitutionIds.Contains(x.InstitutionId) ||
                accessibleBranchIds.Contains(x.Id));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            branchesQuery = branchesQuery.Where(x =>
                x.Name.Contains(search) ||
                (x.City != null && x.City.Contains(search)) ||
                (x.Address != null && x.Address.Contains(search)) ||
                (x.Phone != null && x.Phone.Contains(search)) ||
                (x.Email != null && x.Email.Contains(search)) ||
                x.Institution.Name.Contains(search) ||
                x.UserBranches.Any(ub =>
                    ub.IsActive &&
                    (
                        (ub.User.FullName != null && ub.User.FullName.Contains(search)) ||
                        (ub.User.UserName != null && ub.User.UserName.Contains(search))
                    )));
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && !query.Status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                branchesQuery = branchesQuery.Where(x => x.IsActive && x.Status == InstitutionStatus.Active);
            }
            else if (query.Status.Equals("maintenance", StringComparison.OrdinalIgnoreCase))
            {
                branchesQuery = branchesQuery.Where(x =>
                    x.Status == InstitutionStatus.Maintenance ||
                    x.Status == InstitutionStatus.Suspended ||
                    x.Status == InstitutionStatus.Pending);
            }
            else if (query.Status.Equals("closed", StringComparison.OrdinalIgnoreCase) ||
                     query.Status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
            {
                branchesQuery = branchesQuery.Where(x => !x.IsActive || x.Status == InstitutionStatus.Closed || x.Status == InstitutionStatus.Inactive);
            }
        }

        if (!string.IsNullOrWhiteSpace(query.InstitutionId) &&
            Guid.TryParse(query.InstitutionId, out var filterInstitutionId))
        {
            branchesQuery = branchesQuery.Where(x => x.InstitutionId == filterInstitutionId);
        }

        var branches = await branchesQuery
            .OrderBy(x => x.Institution.Name)
            .ThenBy(x => x.Name)
            .Select(b => new
            {
                b.Id,
                b.InstitutionId,
                InstitutionName = b.Institution.Name,
                b.Name,
                b.City,
                b.Phone,
                b.Email,
                Capacity = b.Capacity ?? 0,
                b.Status,
                b.IsActive,
                b.OperatingHoursStart,
                b.OperatingHoursEnd,
            })
            .ToListAsync(cancellationToken);

        var branchIds = branches.Select(x => x.Id).ToList();

        var libraryCounts = branchIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.Libraries
                .AsNoTracking()
                .Where(x => !x.IsDeleted && branchIds.Contains(x.BranchId))
                .GroupBy(x => x.BranchId)
                .Select(g => new { BranchId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.BranchId, x => x.Count, cancellationToken);

        var branchStats = await InstitutionStatsHelper.GetBranchStatsAsync(
            _dbContext, branchIds, cancellationToken);

        var managerNames = await GetBranchManagerNamesAsync(branchIds, cancellationToken);

        var nowUtc = DateTime.UtcNow;
        var planRevenueRows = await LoadBranchPlanRevenueRowsAsync(branchIds, cancellationToken);

        var revenueByBranch = InstitutionRevenueHelper.AggregateByBranch(planRevenueRows, nowUtc);

        var summaryRevenue = revenueByBranch.Count > 0
            ? InstitutionRevenueMetrics.Sum(revenueByBranch.Values)
            : InstitutionRevenueMetrics.Empty;

        var items = branches.Select(branch =>
        {
            libraryCounts.TryGetValue(branch.Id, out var libraryCount);
            branchStats.TryGetValue(branch.Id, out var stats);
            stats ??= new InstitutionBranchStats();
            managerNames.TryGetValue(branch.Id, out var managerName);

            return new BranchListItemResponse
            {
                Id = branch.Id,
                InstitutionId = branch.InstitutionId,
                InstitutionName = branch.InstitutionName,
                Name = branch.Name,
                City = branch.City,
                Contact = branch.Phone ?? branch.Email,
                ManagerName = managerName,
                Capacity = branch.Capacity,
                MemberCount = stats.MemberCount,
                OccupancyPercent = stats.OccupancyPercent,
                LibraryCount = libraryCount,
                Status = InstitutionUiHelper.ToBranchStatusLabel(branch.Status, branch.IsActive),
                IsActive = branch.IsActive,
                HoursStart = branch.OperatingHoursStart?.ToString("HH:mm"),
                HoursEnd = branch.OperatingHoursEnd?.ToString("HH:mm"),
            };
        }).ToList();

        var totalCapacity = items.Sum(x => x.Capacity);
        var totalOccupied = items.Sum(x => x.MemberCount);
        var activeBranches = items.Count(x => x.IsActive && x.Status == "Active");
        var averageOccupancy = items.Count > 0
            ? Math.Round(items.Average(x => x.OccupancyPercent), 1)
            : 0m;
        var nearCapacity = items.Count(x => x.OccupancyPercent >= 80);
        var totalLibraries = items.Sum(x => x.LibraryCount);
        var cityCount = items.Select(x => x.City).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().Count();

        var insights = items
            .Select(x => new BranchListInsightResponse
            {
                BranchId = x.Id,
                InstitutionId = x.InstitutionId,
                InstitutionName = x.InstitutionName,
                Name = x.Name,
                City = x.City,
                OccupancyPercent = x.OccupancyPercent,
                MemberCount = x.MemberCount,
                LibraryCount = x.LibraryCount,
                Capacity = x.Capacity,
            })
            .ToList();

        return new BranchListViewResponse
        {
            Summary = new BranchListSummaryResponse
            {
                TotalBranches = items.Count,
                ActiveBranches = activeBranches,
                TotalCapacity = totalCapacity,
                TotalOccupied = totalOccupied,
                AverageOccupancyPercent = averageOccupancy,
                NearCapacityCount = nearCapacity,
                TotalLibraries = totalLibraries,
                CityCount = cityCount,
                RevenueMtd = summaryRevenue.Mtd,
                RevenuePreviousMtd = summaryRevenue.PreviousMtd,
                RevenueMonthly = summaryRevenue.Monthly,
                RevenueQuarterly = summaryRevenue.Quarterly,
                RevenueYearly = summaryRevenue.Yearly,
                RevenueAllTime = summaryRevenue.AllTime,
            },
            Items = items,
            TopPerformer = insights
                .OrderByDescending(x => x.OccupancyPercent)
                .ThenByDescending(x => x.MemberCount)
                .FirstOrDefault(),
            NeedsAttention = insights
                .OrderBy(x => x.OccupancyPercent)
                .ThenBy(x => x.MemberCount)
                .Take(4)
                .ToList(),
        };
    }

    public async Task<BranchDetailViewResponse?> GetDetailViewAsync(
        Guid branchId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (!await CanAccessBranchAsync(branchId, userId, cancellationToken))
        {
            return null;
        }

        var branch = await _dbContext.Branches
            .AsNoTracking()
            .Where(x => x.Id == branchId && !x.IsDeleted)
            .Select(b => new
            {
                b.Id,
                b.InstitutionId,
                InstitutionName = b.Institution.Name,
                b.Name,
                b.Description,
                b.City,
                b.Address,
                b.Email,
                b.Phone,
                Capacity = b.Capacity ?? 0,
                b.Status,
                b.IsActive,
                b.OperatingHoursStart,
                b.OperatingHoursEnd,
                b.Latitude,
                b.Longitude,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (branch is null)
        {
            return null;
        }

        var branchIds = new[] { branchId };
        var branchStats = await InstitutionStatsHelper.GetBranchStatsAsync(
            _dbContext, branchIds, cancellationToken);
        branchStats.TryGetValue(branchId, out var stats);
        stats ??= new InstitutionBranchStats();

        var managerNames = await GetBranchManagerNamesAsync(branchIds, cancellationToken);
        managerNames.TryGetValue(branchId, out var managerName);

        var nowUtc = DateTime.UtcNow;
        var planRevenueRows = await LoadBranchPlanRevenueRowsAsync(branchIds, cancellationToken);
        var revenue = InstitutionRevenueHelper.AggregateByBranch(planRevenueRows, nowUtc)
            .GetValueOrDefault(branchId, InstitutionRevenueMetrics.Empty);

        var endDate = nowUtc.Date;
        var startDate14 = endDate.AddDays(-13);

        var occupancyTrend = await BranchOverviewHelper.BuildOccupancyTrendAsync(
            _dbContext, branchId, branch.Capacity, startDate14, endDate, cancellationToken);
        var attendanceTrend = await BranchOverviewHelper.BuildAttendanceTrendAsync(
            _dbContext, branchId, 14, cancellationToken);
        var occupancyHeatmap = await BranchOverviewHelper.BuildOccupancyHeatmapAsync(
            _dbContext, branchId, branch.Capacity, cancellationToken);
        var peakHours = await BranchOverviewHelper.BuildPeakHoursAsync(
            _dbContext, branchId, cancellationToken);
        var footfallByShift = await BranchOverviewHelper.BuildFootfallByShiftAsync(
            _dbContext, branchId, cancellationToken);
        var avgFootfall = await BranchOverviewHelper.BuildAvgFootfallPerDayAsync(
            _dbContext, branchId, cancellationToken);
        var activity = await BranchOverviewHelper.BuildActivityAsync(
            _dbContext, branchId, cancellationToken);

        var libraries = await _dbContext.Libraries
            .AsNoTracking()
            .Where(x => x.BranchId == branchId && !x.IsDeleted)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var libraryIds = libraries.Select(x => x.Id).ToList();
        var libraryMemberCounts = libraryIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.MemberLibraries
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsCurrent && libraryIds.Contains(x.LibraryId))
                .GroupBy(x => x.LibraryId)
                .Select(g => new { LibraryId = g.Key, Count = g.Select(x => x.MemberId).Distinct().Count() })
                .ToDictionaryAsync(x => x.LibraryId, x => x.Count, cancellationToken);

        var libraryCards = libraries.Select(lib =>
        {
            libraryMemberCounts.TryGetValue(lib.Id, out var memberCount);
            var capacity = lib.Capacity ?? 0;
            var occupancyPercent = capacity > 0
                ? Math.Round((decimal)memberCount / capacity * 100m, 1)
                : 0m;

            return new InstitutionLibraryCardResponse
            {
                Id = lib.Id,
                BranchId = lib.BranchId,
                Name = lib.Name,
                BranchName = branch.Name,
                City = branch.City,
                Floor = lib.Floor,
                Capacity = capacity,
                MemberCount = memberCount,
                OccupancyPercent = occupancyPercent,
                Status = InstitutionUiHelper.ToLibraryStatusLabel(lib.Status, lib.IsActive),
                IsActive = lib.IsActive
            };
        }).ToList();

        var staff = await LoadBranchStaffAsync(branchId, cancellationToken);

        return new BranchDetailViewResponse
        {
            Id = branch.Id,
            InstitutionId = branch.InstitutionId,
            InstitutionName = branch.InstitutionName,
            Name = branch.Name,
            Description = branch.Description,
            City = branch.City,
            Address = branch.Address,
            Email = branch.Email,
            Phone = branch.Phone,
            ManagerName = managerName,
            Status = InstitutionUiHelper.ToBranchStatusLabel(branch.Status, branch.IsActive),
            IsActive = branch.IsActive,
            HoursStart = branch.OperatingHoursStart?.ToString("HH:mm"),
            HoursEnd = branch.OperatingHoursEnd?.ToString("HH:mm"),
            Latitude = branch.Latitude,
            Longitude = branch.Longitude,
            Capacity = branch.Capacity,
            MemberCount = stats.MemberCount,
            OccupancyPercent = stats.OccupancyPercent,
            LibraryCount = libraryCards.Count,
            AvgFootfallPerDay = avgFootfall,
            RevenueMtd = revenue.Mtd,
            RevenuePreviousMtd = revenue.PreviousMtd,
            RevenueMonthly = revenue.Monthly,
            RevenueQuarterly = revenue.Quarterly,
            RevenueYearly = revenue.Yearly,
            RevenueAllTime = revenue.AllTime,
            OccupancyTrend = occupancyTrend,
            AttendanceTrend = attendanceTrend,
            OccupancyHeatmap = occupancyHeatmap,
            PeakHours = peakHours,
            FootfallByShift = footfallByShift,
            Libraries = libraryCards,
            Staff = staff,
            Activity = activity,
        };
    }

    private async Task<List<(Guid BranchId, decimal PaidAmount, DateTime CreatedAtUtc)>> LoadBranchPlanRevenueRowsAsync(
        IReadOnlyCollection<Guid> branchIds,
        CancellationToken cancellationToken)
    {
        if (branchIds.Count == 0)
        {
            return [];
        }

        var rows = await (
            from mp in _dbContext.MemberPlans.AsNoTracking()
            join ml in _dbContext.MemberLibraries.AsNoTracking() on mp.MemberId equals ml.MemberId
            where !mp.IsDeleted && !ml.IsDeleted && ml.IsCurrent && branchIds.Contains(ml.BranchId)
            select new { ml.BranchId, mp.PaidAmount, mp.CreatedAtUtc }
        ).ToListAsync(cancellationToken);

        return rows.Select(x => (x.BranchId, x.PaidAmount, x.CreatedAtUtc)).ToList();
    }

    private async Task<Dictionary<Guid, string>> GetBranchManagerNamesAsync(
        IReadOnlyCollection<Guid> branchIds,
        CancellationToken cancellationToken)
    {
        if (branchIds.Count == 0)
        {
            return [];
        }

        var assignments = await (
            from ub in _dbContext.UserBranches.AsNoTracking()
            join u in _dbContext.Users.AsNoTracking() on ub.UserId equals u.Id
            where branchIds.Contains(ub.BranchId) && ub.IsActive
            select new
            {
                ub.BranchId,
                ub.IsPrimary,
                ub.AssignedAtUtc,
                ManagerName = u.FullName ?? u.UserName ?? u.Email ?? string.Empty,
                IsBranchManager = _dbContext.UserRoles
                    .Any(ur => ur.UserId == u.Id &&
                               _dbContext.Roles.Any(r => r.Id == ur.RoleId && r.Name == RoleDefinitions.BranchManager)),
            }
        ).ToListAsync(cancellationToken);

        return assignments
            .Where(x => !string.IsNullOrWhiteSpace(x.ManagerName))
            .GroupBy(x => x.BranchId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.IsBranchManager)
                    .ThenByDescending(x => x.IsPrimary)
                    .ThenBy(x => x.AssignedAtUtc)
                    .First()
                    .ManagerName);
    }

    private async Task<bool> CanAccessBranchAsync(
        Guid branchId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken))
        {
            return await _dbContext.Branches
                .AsNoTracking()
                .AnyAsync(x => x.Id == branchId && !x.IsDeleted, cancellationToken);
        }

        var userIdString = userId.ToString();
        var branch = await _dbContext.Branches
            .AsNoTracking()
            .Where(x => x.Id == branchId && !x.IsDeleted)
            .Select(x => new { x.InstitutionId })
            .FirstOrDefaultAsync(cancellationToken);

        if (branch is null)
        {
            return false;
        }

        var hasInstitutionAccess = await _dbContext.UserInstitutions
            .AsNoTracking()
            .AnyAsync(ui => ui.UserId == userIdString && ui.IsActive && ui.InstitutionId == branch.InstitutionId, cancellationToken);

        if (hasInstitutionAccess)
        {
            return true;
        }

        return await _dbContext.UserBranches
            .AsNoTracking()
            .AnyAsync(ub => ub.UserId == userIdString && ub.IsActive && ub.BranchId == branchId, cancellationToken);
    }

    private async Task<IReadOnlyCollection<BranchStaffMemberResponse>> LoadBranchStaffAsync(
        Guid branchId,
        CancellationToken cancellationToken)
    {
        var assignments = await (
            from ub in _dbContext.UserBranches.AsNoTracking()
            join u in _dbContext.Users.AsNoTracking() on ub.UserId equals u.Id
            where ub.BranchId == branchId && ub.IsActive
            select new
            {
                u.Id,
                Name = u.FullName ?? u.UserName ?? u.Email ?? "User",
                u.PhoneNumber,
                u.Email,
                ub.IsPrimary,
            }
        ).ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            return [];
        }

        var userIds = assignments.Select(x => x.Id).ToList();
        var roleRows = await (
            from ur in _dbContext.UserRoles.AsNoTracking()
            join r in _dbContext.Roles.AsNoTracking() on ur.RoleId equals r.Id
            where userIds.Contains(ur.UserId)
            select new { ur.UserId, RoleName = r.Name }
        ).ToListAsync(cancellationToken);

        var rolesByUser = roleRows
            .GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.RoleName).FirstOrDefault());

        return assignments
            .OrderByDescending(x => x.IsPrimary)
            .ThenBy(x => x.Name)
            .Select(x => new BranchStaffMemberResponse
            {
                Id = x.Id,
                Name = x.Name,
                Role = rolesByUser.GetValueOrDefault(x.Id),
                Phone = x.PhoneNumber,
                Email = x.Email,
                IsPrimary = x.IsPrimary,
            })
            .ToList();
    }

    private async Task<bool> IsSuperAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return false;
        }

        return await _userManager.IsInRoleAsync(user, RoleDefinitions.SuperAdmin);
    }

    public async Task<IReadOnlyCollection<BranchResponse>> GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken = default)
    {
        await EnsureInstitutionExistsAsync(institutionId, cancellationToken);

        return await _dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == institutionId && !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => ToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<BranchResponse?> GetByIdAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken);

        return entity is null ? null : ToResponse(entity);
    }

    public async Task<BranchResponse> CreateAsync(Guid institutionId, CreateBranchRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var institution = await _dbContext.Institutions.FirstOrDefaultAsync(x => x.Id == institutionId && !x.IsDeleted, cancellationToken)  ?? throw new InvalidOperationException("Institution not found.");

        var entity = new Branch
        {
            InstitutionId = institutionId,
            Name = request.Name,
            Description = request.Description,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            City = request.City,
            OperatingHoursStart = request.OpenAt,
            OperatingHoursEnd = request.ClosesAt,
            Capacity = request.Capacity,
            IsActive = request.IsActive,
            Status = request.Status,
            CreatedBy = userId.ToString()
        };

        _dbContext.Branches.Add(entity);

        _dbContext.UserBranches.Add(new UserBranch
        {
            UserId = userId.ToString(),
            InstitutionId = institutionId,
            Branch = entity,          // EF Core sets BranchId automatically
            IsPrimary = request.IsPrimary,
            IsActive = true,
            AssignedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        if (request.IsOnboarding)
        {
            await _authService.UpdateOnboardingStepAsync(userId.ToString(), OnboardingStep.Branch, cancellationToken);
        }

        

        return ToResponse(entity);
    }

    public async Task<BranchResponse> UpdateAsync(Guid institutionId, Guid branchId, UpdateBranchRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Branches
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        if (request.Name is not null) entity.Name = request.Name;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.Address is not null) entity.Address = request.Address;
        if (request.City is not null) entity.City = request.City;
        if (request.Latitude.HasValue) entity.Latitude = request.Latitude;
        if (request.Longitude.HasValue) entity.Longitude = request.Longitude;
        if (request.OperatingHoursStart.HasValue) entity.OperatingHoursStart = request.OperatingHoursStart;
        if (request.OperatingHoursEnd.HasValue) entity.OperatingHoursEnd = request.OperatingHoursEnd;
        if (request.Capacity.HasValue) entity.Capacity = request.Capacity;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;

        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteAsync(Guid institutionId, Guid branchId, string? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Branches
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        entity.IsDeleted = true;
        entity.DeletedAtUtc = DateTime.UtcNow;
        entity.IsActive = false;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<OrganizationAnalyticsResponse> GetAnalyticsAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        var branch = await _dbContext.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        var libraryCount = await _dbContext.Libraries.CountAsync(x => x.BranchId == branch.Id && !x.IsDeleted, cancellationToken);
        var activeLibraryCount = await _dbContext.Libraries.CountAsync(x => x.BranchId == branch.Id && !x.IsDeleted && x.IsActive, cancellationToken);

        return new OrganizationAnalyticsResponse
        {
            BranchCount = 1,
            ActiveBranchCount = branch.IsActive ? 1 : 0,
            LibraryCount = libraryCount,
            ActiveLibraryCount = activeLibraryCount
        };
    }

    private async Task EnsureInstitutionExistsAsync(Guid institutionId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Institutions.AnyAsync(x => x.Id == institutionId && !x.IsDeleted, cancellationToken);
        if (!exists)
        {
            throw new InvalidOperationException("Institution not found.");
        }
    }

    private static BranchResponse ToResponse(Branch entity) =>
        new()
        {
            Id = entity.Id,
            InstitutionId = entity.InstitutionId,
            Name = entity.Name,
            Description = entity.Description,
            Address = entity.Address,
            City = entity.City,
            Latitude = entity.Latitude,
            Longitude = entity.Longitude,
            OperatingHoursStart = entity.OperatingHoursStart,
            OperatingHoursEnd = entity.OperatingHoursEnd,
            Capacity = entity.Capacity,
            IsActive = entity.IsActive,
            CreatedAtUtc = entity.CreatedAtUtc,
            Status = entity.Status,
        };
}
