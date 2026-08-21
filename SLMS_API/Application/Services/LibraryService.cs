using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Contracts.Plan;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class LibraryService : ILibraryService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuthService _authService;
    private readonly IPlanService _planService;

    public LibraryService(
        ApplicationDbContext dbContext,
        IAuthService authService,
        IPlanService planService)
    {
        _dbContext = dbContext;
        _authService = authService;
        _planService = planService;
    }

    public Task<LibraryListViewResponse> GetListViewAsync(
        LibraryListQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
        => BuildListViewAsync(query, userId, includeRevenue: false, cancellationToken);

    public Task<LibraryListRevenueSummaryResponse> GetListRevenueSummaryAsync(
        LibraryListQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
        => BuildRevenueSummaryAsync(query, userId, cancellationToken);

    public async Task<LibraryDetailViewResponse?> GetDetailViewAsync(
        Guid libraryId,
        Guid userId,
        int trendDays = 30,
        CancellationToken cancellationToken = default)
    {
        var scopedLibrariesQuery = await BuildScopedLibrariesQueryAsync(new LibraryListQuery(), userId, cancellationToken);
        var libraryRow = await (
            from l in scopedLibrariesQuery.Where(x => x.Id == libraryId)
            join i in _dbContext.Institutions.AsNoTracking() on l.InstitutionId equals i.Id
            join b in _dbContext.Branches.AsNoTracking() on l.BranchId equals b.Id
            select new
            {
                l.Id,
                l.InstitutionId,
                InstitutionName = i.Name,
                l.BranchId,
                BranchName = b.Name,
                BranchCity = b.City,
                l.Name,
                l.Description,
                l.Address,
                l.Email,
                l.Phone,
                BranchEmail = b.Email,
                BranchPhone = b.Phone,
                l.Floor,
                Capacity = l.Capacity ?? 0,
                l.Status,
                l.IsActive,
                BranchHoursStart = b.OperatingHoursStart,
                BranchHoursEnd = b.OperatingHoursEnd,
            }
        ).FirstOrDefaultAsync(cancellationToken);

        if (libraryRow is null)
        {
            return null;
        }

        var memberCount = await _dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && x.LibraryId == libraryId)
            .Select(x => x.MemberId)
            .Distinct()
            .CountAsync(cancellationToken);

        var occupancyPercent = libraryRow.Capacity > 0
            ? Math.Round((decimal)memberCount / libraryRow.Capacity * 100m, 1)
            : 0m;

        var nowUtc = DateTime.UtcNow;
        var normalizedTrendDays = trendDays is 7 or 30 or 90 ? trendDays : 30;
        var endDate = nowUtc.Date;
        var startDate = endDate.AddDays(-(normalizedTrendDays - 1));

        var occupancyTrend = await LibraryOverviewHelper.BuildOccupancyTrendAsync(
            _dbContext,
            libraryId,
            libraryRow.Capacity,
            startDate,
            endDate,
            cancellationToken);

        var (peakHourStart, peakHourEnd) = await LibraryOverviewHelper.BuildPeakHourWindowAsync(
            _dbContext,
            libraryId,
            cancellationToken);

        var checkedInToday = await LibraryOverviewHelper.BuildCheckedInTodayAsync(
            _dbContext,
            libraryId,
            cancellationToken);

        var weeklyHours = await LibraryOverviewHelper.LoadWeeklyHoursAsync(
            _dbContext,
            libraryId,
            libraryRow.BranchHoursStart,
            libraryRow.BranchHoursEnd,
            cancellationToken);

        var hoursExceptions = await LibraryOverviewHelper.LoadHoursExceptionsAsync(
            _dbContext,
            libraryId,
            cancellationToken);

        var seats = await LibraryOverviewHelper.BuildSeatsAsync(
            _dbContext,
            libraryId,
            libraryRow.Floor ?? 1,
            libraryRow.Capacity,
            cancellationToken);

        var sections = LibraryOverviewHelper.BuildSectionsFromSeats(seats);

        var recentActivity = await LibraryOverviewHelper.BuildRecentActivityAsync(
            _dbContext,
            libraryId,
            cancellationToken);

        var siblingLibraries = await _dbContext.Libraries
            .AsNoTracking()
            .Where(x => x.BranchId == libraryRow.BranchId && !x.IsDeleted)
            .Select(x => new
            {
                x.Id,
                x.Floor,
                Capacity = x.Capacity ?? 0,
            })
            .ToListAsync(cancellationToken);

        var siblingIds = siblingLibraries.Select(x => x.Id).ToList();
        var siblingMemberCounts = siblingIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.MemberLibraries
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsCurrent && siblingIds.Contains(x.LibraryId))
                .GroupBy(x => x.LibraryId)
                .Select(g => new { LibraryId = g.Key, Count = g.Select(x => x.MemberId).Distinct().Count() })
                .ToDictionaryAsync(x => x.LibraryId, x => x.Count, cancellationToken);

        var floorBreakdown = siblingLibraries
            .GroupBy(x => x.Floor ?? 0)
            .Select(group =>
            {
                var capacity = group.Sum(x => x.Capacity);
                var occupied = group.Sum(x => siblingMemberCounts.GetValueOrDefault(x.Id));
                return new LibraryFloorBreakdownResponse
                {
                    Floor = group.Key,
                    Libraries = group.Count(),
                    Capacity = capacity,
                    Occupied = occupied,
                };
            })
            .OrderBy(x => x.Floor)
            .ToList();

        return new LibraryDetailViewResponse
        {
            Id = libraryRow.Id,
            InstitutionId = libraryRow.InstitutionId,
            InstitutionName = libraryRow.InstitutionName,
            BranchId = libraryRow.BranchId,
            BranchName = libraryRow.BranchName,
            City = libraryRow.BranchCity,
            Name = libraryRow.Name,
            Description = libraryRow.Description,
            Address = libraryRow.Address,
            Email = libraryRow.Email ?? libraryRow.BranchEmail,
            Phone = libraryRow.Phone ?? libraryRow.BranchPhone,
            Floor = libraryRow.Floor,
            Capacity = libraryRow.Capacity,
            MemberCount = memberCount,
            CheckedInToday = checkedInToday,
            OccupancyPercent = occupancyPercent,
            Status = InstitutionUiHelper.ToLibraryStatusLabel(libraryRow.Status, libraryRow.IsActive),
            IsActive = libraryRow.IsActive,
            HoursStart = libraryRow.BranchHoursStart?.ToString("HH:mm"),
            HoursEnd = libraryRow.BranchHoursEnd?.ToString("HH:mm"),
            BranchHoursStart = libraryRow.BranchHoursStart?.ToString("HH:mm"),
            BranchHoursEnd = libraryRow.BranchHoursEnd?.ToString("HH:mm"),
            PeakHourStart = peakHourStart,
            PeakHourEnd = peakHourEnd,
            OccupancyTrend = occupancyTrend,
            FloorBreakdown = floorBreakdown,
            WeeklyHours = weeklyHours,
            HoursExceptions = hoursExceptions,
            Seats = seats,
            Sections = sections,
            RecentActivity = recentActivity,
        };
    }

    public async Task<LibraryCalendarViewResponse?> GetCalendarViewAsync(
        Guid libraryId,
        Guid userId,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken = default)
    {
        var scopedLibrariesQuery = await BuildScopedLibrariesQueryAsync(new LibraryListQuery(), userId, cancellationToken);
        var hasAccess = await scopedLibrariesQuery.AnyAsync(x => x.Id == libraryId, cancellationToken);
        if (!hasAccess)
        {
            return null;
        }

        try
        {
            return await LibraryOverviewHelper.BuildCalendarViewAsync(
                _dbContext,
                libraryId,
                startDate,
                endDate,
                cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return null;
        }
    }

    private async Task<LibraryListViewResponse> BuildListViewAsync(
        LibraryListQuery query,
        Guid userId,
        bool includeRevenue,
        CancellationToken cancellationToken)
    {
        var scopedLibrariesQuery = await BuildScopedLibrariesQueryAsync(query, userId, cancellationToken);
        var libraries = await LoadLibrariesWithMemberCountsAsync(scopedLibrariesQuery, cancellationToken);

        InstitutionRevenueMetrics summaryRevenue = InstitutionRevenueMetrics.Empty;
        if (includeRevenue)
        {
            var libraryIdsQuery = scopedLibrariesQuery.Select(x => x.Id);
            summaryRevenue = await InstitutionRevenueHelper.AggregateSummaryForLibrariesAsync(
                _dbContext, libraryIdsQuery, DateTime.UtcNow, cancellationToken);
        }

        return BuildListViewResponse(libraries, summaryRevenue);
    }

    private async Task<LibraryListRevenueSummaryResponse> BuildRevenueSummaryAsync(
        LibraryListQuery query,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var scopedLibrariesQuery = await BuildScopedLibrariesQueryAsync(query, userId, cancellationToken);
        var summaryRevenue = await InstitutionRevenueHelper.AggregateSummaryForLibrariesAsync(
            _dbContext,
            scopedLibrariesQuery.Select(x => x.Id),
            DateTime.UtcNow,
            cancellationToken);

        return new LibraryListRevenueSummaryResponse
        {
            RevenueMtd = summaryRevenue.Mtd,
            RevenuePreviousMtd = summaryRevenue.PreviousMtd,
            RevenueMonthly = summaryRevenue.Monthly,
            RevenueQuarterly = summaryRevenue.Quarterly,
            RevenueYearly = summaryRevenue.Yearly,
            RevenueAllTime = summaryRevenue.AllTime,
        };
    }

    private async Task<IQueryable<Library>> BuildScopedLibrariesQueryAsync(
        LibraryListQuery query,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var userIdString = userId.ToString();
        var isSuperAdmin = await IsSuperAdminAsync(userId, cancellationToken);

        var librariesQuery = _dbContext.Libraries
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

            var accessibleLibraryIds = await _dbContext.UserLibraries
                .AsNoTracking()
                .Where(ul => ul.UserId == userIdString && ul.IsActive)
                .Select(ul => ul.LibraryId)
                .ToListAsync(cancellationToken);

            librariesQuery = librariesQuery.Where(x =>
                accessibleInstitutionIds.Contains(x.InstitutionId) ||
                accessibleBranchIds.Contains(x.BranchId) ||
                accessibleLibraryIds.Contains(x.Id));
        }

        return ApplyListFilters(librariesQuery, query);
    }

    private IQueryable<Library> ApplyListFilters(IQueryable<Library> librariesQuery, LibraryListQuery query)
    {
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            librariesQuery = librariesQuery.Where(x =>
                x.Name.Contains(search) ||
                (x.Address != null && x.Address.Contains(search)) ||
                _dbContext.Branches.Any(b =>
                    b.Id == x.BranchId &&
                    !b.IsDeleted &&
                    (b.Name.Contains(search) || (b.City != null && b.City.Contains(search)))) ||
                _dbContext.Institutions.Any(i =>
                    i.Id == x.InstitutionId &&
                    !i.IsDeleted &&
                    i.Name.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && !query.Status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                librariesQuery = librariesQuery.Where(x => x.IsActive && x.Status == InstitutionStatus.Active);
            }
            else if (query.Status.Equals("maintenance", StringComparison.OrdinalIgnoreCase))
            {
                librariesQuery = librariesQuery.Where(x =>
                    x.Status == InstitutionStatus.Maintenance ||
                    x.Status == InstitutionStatus.Suspended ||
                    x.Status == InstitutionStatus.Pending);
            }
            else if (query.Status.Equals("closed", StringComparison.OrdinalIgnoreCase) ||
                     query.Status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
            {
                librariesQuery = librariesQuery.Where(x =>
                    !x.IsActive || x.Status == InstitutionStatus.Closed || x.Status == InstitutionStatus.Inactive);
            }
        }

        if (!string.IsNullOrWhiteSpace(query.InstitutionId) &&
            Guid.TryParse(query.InstitutionId, out var filterInstitutionId))
        {
            librariesQuery = librariesQuery.Where(x => x.InstitutionId == filterInstitutionId);
        }

        if (!string.IsNullOrWhiteSpace(query.BranchId) &&
            Guid.TryParse(query.BranchId, out var filterBranchId))
        {
            librariesQuery = librariesQuery.Where(x => x.BranchId == filterBranchId);
        }

        return librariesQuery;
    }

    private async Task<List<LibraryListRow>> LoadLibrariesWithMemberCountsAsync(
        IQueryable<Library> scopedLibrariesQuery,
        CancellationToken cancellationToken)
    {
        var libraries = await (
            from l in scopedLibrariesQuery
            join i in _dbContext.Institutions.AsNoTracking() on l.InstitutionId equals i.Id
            join b in _dbContext.Branches.AsNoTracking() on l.BranchId equals b.Id
            orderby i.Name, b.Name, l.Name
            select new LibraryListRow
            {
                Id = l.Id,
                InstitutionId = l.InstitutionId,
                InstitutionName = i.Name,
                BranchId = l.BranchId,
                BranchName = b.Name,
                BranchCity = b.City,
                Name = l.Name,
                Floor = l.Floor,
                Capacity = l.Capacity ?? 0,
                Status = l.Status,
                IsActive = l.IsActive,
                HoursStart = b.OperatingHoursStart,
                HoursEnd = b.OperatingHoursEnd,
            }
        ).TagWith("LibraryListCore")
         .ToListAsync(cancellationToken);

        if (libraries.Count == 0)
        {
            return libraries;
        }

        var libraryIds = libraries.Select(x => x.Id).ToList();
        var memberCounts = await _dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && libraryIds.Contains(x.LibraryId))
            .GroupBy(x => x.LibraryId)
            .Select(g => new { LibraryId = g.Key, MemberCount = g.Count() })
            .ToDictionaryAsync(x => x.LibraryId, x => x.MemberCount, cancellationToken);

        foreach (var library in libraries)
        {
            if (memberCounts.TryGetValue(library.Id, out var memberCount))
            {
                library.MemberCount = memberCount;
            }
        }

        return libraries;
    }

    private static LibraryListViewResponse BuildListViewResponse(
        IReadOnlyCollection<LibraryListRow> libraries,
        InstitutionRevenueMetrics summaryRevenue)
    {
        var items = libraries.Select(lib =>
        {
            var occupancyPercent = lib.Capacity > 0
                ? Math.Round((decimal)lib.MemberCount / lib.Capacity * 100m, 1)
                : 0m;

            return new LibraryListItemResponse
            {
                Id = lib.Id,
                InstitutionId = lib.InstitutionId,
                InstitutionName = lib.InstitutionName,
                BranchId = lib.BranchId,
                BranchName = lib.BranchName,
                Name = lib.Name,
                City = lib.BranchCity,
                Floor = lib.Floor,
                Capacity = lib.Capacity,
                MemberCount = lib.MemberCount,
                OccupancyPercent = occupancyPercent,
                Status = InstitutionUiHelper.ToLibraryStatusLabel(lib.Status, lib.IsActive),
                IsActive = lib.IsActive,
                HoursStart = lib.HoursStart?.ToString("HH:mm"),
                HoursEnd = lib.HoursEnd?.ToString("HH:mm"),
            };
        }).ToList();

        var totalCapacity = items.Sum(x => x.Capacity);
        var totalOccupied = items.Sum(x => x.MemberCount);
        var activeLibraries = items.Count(x => x.IsActive && x.Status == "Active");
        var averageOccupancy = items.Count > 0
            ? Math.Round(items.Average(x => x.OccupancyPercent), 1)
            : 0m;
        var nearCapacity = items.Count(x => x.OccupancyPercent >= 80);
        var branchCount = items.Select(x => x.BranchId).Distinct().Count();

        var insights = items
            .Select(x => new LibraryListInsightResponse
            {
                LibraryId = x.Id,
                BranchId = x.BranchId,
                InstitutionId = x.InstitutionId,
                InstitutionName = x.InstitutionName,
                BranchName = x.BranchName,
                Name = x.Name,
                City = x.City,
                Floor = x.Floor,
                OccupancyPercent = x.OccupancyPercent,
                MemberCount = x.MemberCount,
                Capacity = x.Capacity,
            })
            .ToList();

        return new LibraryListViewResponse
        {
            Summary = new LibraryListSummaryResponse
            {
                TotalLibraries = items.Count,
                ActiveLibraries = activeLibraries,
                TotalCapacity = totalCapacity,
                TotalOccupied = totalOccupied,
                AverageOccupancyPercent = averageOccupancy,
                NearCapacityCount = nearCapacity,
                BranchCount = branchCount,
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

    private sealed class LibraryListRow
    {
        public Guid Id { get; init; }
        public Guid InstitutionId { get; init; }
        public string InstitutionName { get; init; } = string.Empty;
        public Guid BranchId { get; init; }
        public string BranchName { get; init; } = string.Empty;
        public string? BranchCity { get; init; }
        public string Name { get; init; } = string.Empty;
        public int? Floor { get; init; }
        public int Capacity { get; init; }
        public int MemberCount { get; set; }
        public InstitutionStatus Status { get; init; }
        public bool IsActive { get; init; }
        public TimeOnly? HoursStart { get; init; }
        public TimeOnly? HoursEnd { get; init; }
    }

    private async Task<bool> IsSuperAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var userIdString = userId.ToString();

        return await (
            from ur in _dbContext.UserRoles.AsNoTracking()
            join role in _dbContext.Roles.AsNoTracking() on ur.RoleId equals role.Id
            where ur.UserId == userIdString && role.Name == RoleDefinitions.SuperAdmin
            select ur.UserId
        ).AnyAsync(cancellationToken);
    }

    public async Task<BranchLibraryCapacitySummaryResponse> GetBranchCapacitySummaryAsync(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken = default)
    {
        var branch = await _dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted)
            .Select(x => new { x.Id, x.Name, x.Capacity, x.OperatingHoursStart, x.OperatingHoursEnd })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        var libraries = await _dbContext.Libraries
            .AsNoTracking()
            .Where(x => x.BranchId == branchId && !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => new BranchLibraryCapacityItemResponse
            {
                Id = x.Id,
                Name = x.Name,
                Floor = x.Floor,
                Capacity = x.Capacity ?? 0,
            })
            .ToListAsync(cancellationToken);

        var allocatedCapacity = libraries.Sum(x => x.Capacity);
        var branchCapacity = branch.Capacity ?? 0;
        var hasBranchCapacityLimit = branchCapacity > 0;
        var remainingCapacity = hasBranchCapacityLimit
            ? Math.Max(0, branchCapacity - allocatedCapacity)
            : 0;

        return new BranchLibraryCapacitySummaryResponse
        {
            BranchId = branch.Id,
            BranchName = branch.Name,
            BranchCapacity = branchCapacity,
            AllocatedCapacity = allocatedCapacity,
            RemainingCapacity = remainingCapacity,
            HasBranchCapacityLimit = hasBranchCapacityLimit,
            BranchHoursStart = branch.OperatingHoursStart?.ToString("HH:mm"),
            BranchHoursEnd = branch.OperatingHoursEnd?.ToString("HH:mm"),
            Libraries = libraries,
        };
    }

    public async Task<IReadOnlyCollection<LibraryResponse>> GetByBranchAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        return await _dbContext.Libraries
          .AsNoTracking()
          .Where(x => x.BranchId == branchId && !x.IsDeleted)
          .OrderBy(x => x.Name)
          .Select(x => ToResponse(x))
          .ToListAsync(cancellationToken);
    }

    public async Task<LibraryResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        var entity = await _dbContext.Libraries
          .AsNoTracking()
          .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Id == libraryId && !x.IsDeleted, cancellationToken);

        return entity is null ? null : ToResponse(entity);
    }

    public async Task<LibraryResponse> CreateAsync(Guid institutionId, Guid branchId, CreateLibraryRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        var branch = await _dbContext.Branches.FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken) ?? throw new InvalidOperationException("Branch not found.");

        if (request.Capacity is > 0)
        {
            var branchCapacity = branch.Capacity ?? 0;
            if (branchCapacity > 0)
            {
                var allocatedCapacity = await _dbContext.Libraries
                    .Where(x => x.BranchId == branchId && !x.IsDeleted)
                    .SumAsync(x => x.Capacity ?? 0, cancellationToken);

                var remainingCapacity = branchCapacity - allocatedCapacity;
                if (request.Capacity.Value > remainingCapacity)
                {
                    throw new InvalidOperationException(
                        remainingCapacity <= 0
                            ? $"Branch seat capacity is fully allocated ({allocatedCapacity} of {branchCapacity} seats used by other libraries)."
                            : $"Library capacity cannot exceed remaining branch seats ({remainingCapacity} available of {branchCapacity}).");
                }
            }
        }

        var library = new Library
        {
            BranchId = branchId,
            InstitutionId = institutionId,
            Name = request.Name,
            Description = request.Description,
            Address = request.Address,
            Email = request.Email,
            Phone = request.Phone,
            Floor = request.Floor,
            Capacity = request.Capacity,
            IsActive = request.IsActive,
            CreatedBy = userId,
            Status = request.Status,
        };

        _dbContext.Libraries.Add(library);

        var defaultWeeklyHours = LibraryOverviewHelper.CreateDefaultWeeklyHours(
            library.Id,
            branch.OperatingHoursStart,
            branch.OperatingHoursEnd,
            userId);
        _dbContext.LibraryWeeklyHours.AddRange(defaultWeeklyHours);

        // Create mapping with the logged-in user
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var userLibrary = new UserLibrary
            {
                UserId = userId,
                InstitutionId = institutionId,
                BranchId = branchId,
                Library = library, // EF will populate LibraryId after SaveChanges
                AssignedAtUtc = DateTime.UtcNow,
                IsPrimary = request.IsPrimary,
                IsActive = true
            };

            _dbContext.UserLibraries.Add(userLibrary);
        }
        await _dbContext.SaveChangesAsync(cancellationToken);
        await CreateDefaultPlansAsync(institutionId, branchId, library, userId.ToString(), cancellationToken);

        if (request.IsOnboarding)
        {
            await _authService.UpdateOnboardingStepAsync(userId.ToString(), OnboardingStep.Completed, cancellationToken);
        }

        return ToResponse(library);
    }

    public async Task<LibraryResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid libraryId, UpdateLibraryRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        var entity = await _dbContext.Libraries
          .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Id == libraryId && !x.IsDeleted, cancellationToken)
          ?? throw new InvalidOperationException("Library not found.");

        if (request.Capacity is > 0)
        {
            var branch = await _dbContext.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == branchId && !x.IsDeleted, cancellationToken)
                ?? throw new InvalidOperationException("Branch not found.");

            var branchCapacity = branch.Capacity ?? 0;
            if (branchCapacity > 0)
            {
                var allocatedCapacity = await _dbContext.Libraries
                    .Where(x => x.BranchId == branchId && !x.IsDeleted && x.Id != libraryId)
                    .SumAsync(x => x.Capacity ?? 0, cancellationToken);

                var remainingCapacity = branchCapacity - allocatedCapacity;
                if (request.Capacity.Value > remainingCapacity)
                {
                    throw new InvalidOperationException(
                        remainingCapacity <= 0
                            ? $"Branch seat capacity is fully allocated ({allocatedCapacity} of {branchCapacity} seats used by other libraries)."
                            : $"Library capacity cannot exceed remaining branch seats ({remainingCapacity} available of {branchCapacity}).");
                }
            }
        }

        if (request.Name is not null) entity.Name = request.Name;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.Address is not null) entity.Address = request.Address;
        if (request.Phone is not null) entity.Phone = request.Phone;
        if (request.Floor.HasValue) entity.Floor = request.Floor;
        if (request.Capacity.HasValue) entity.Capacity = request.Capacity;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;

        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task<IReadOnlyCollection<LibraryDayHoursResponse>> UpdateWeeklyHoursAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        UpdateLibraryWeeklyHoursRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryExistsAsync(institutionId, branchId, libraryId, cancellationToken);

        if (request.WeeklyHours.Count != 7)
        {
            throw new InvalidOperationException("Weekly hours must include all seven days.");
        }

        foreach (var dayHours in request.WeeklyHours)
        {
            var validationError = LibraryOverviewHelper.ValidateDayHours(dayHours);
            if (validationError is not null)
            {
                throw new InvalidOperationException(validationError);
            }
        }

        var existingRows = await _dbContext.LibraryWeeklyHours
            .Where(x => x.LibraryId == libraryId && !x.IsDeleted)
            .ToListAsync(cancellationToken);

        var existingByDay = existingRows.ToDictionary(x => x.Day, StringComparer.OrdinalIgnoreCase);

        foreach (var dayHours in request.WeeklyHours)
        {
            var day = dayHours.Day.ToLowerInvariant();
            var openTime = dayHours.Closed ? null : LibraryOverviewHelper.ParseTime(dayHours.Open);
            var closeTime = dayHours.Closed ? null : LibraryOverviewHelper.ParseTime(dayHours.Close);

            if (existingByDay.TryGetValue(day, out var row))
            {
                row.Closed = dayHours.Closed;
                row.OpenTime = openTime;
                row.CloseTime = closeTime;
                row.UpdatedAtUtc = DateTime.UtcNow;
                row.UpdatedBy = userId;
                continue;
            }

            _dbContext.LibraryWeeklyHours.Add(new LibraryWeeklyHour
            {
                LibraryId = libraryId,
                Day = day,
                Closed = dayHours.Closed,
                OpenTime = openTime,
                CloseTime = closeTime,
                CreatedBy = userId,
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var branchHours = await _dbContext.Libraries
            .AsNoTracking()
            .Where(x => x.Id == libraryId && !x.IsDeleted)
            .Select(x => new
            {
                BranchOpen = x.Branch!.OperatingHoursStart,
                BranchClose = x.Branch.OperatingHoursEnd,
            })
            .FirstAsync(cancellationToken);

        return await LibraryOverviewHelper.LoadWeeklyHoursAsync(
            _dbContext,
            libraryId,
            branchHours.BranchOpen,
            branchHours.BranchClose,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<LibraryHoursExceptionResponse>> UpdateHoursExceptionsAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        UpdateLibraryHoursExceptionsRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryExistsAsync(institutionId, branchId, libraryId, cancellationToken);

        var existingRows = await _dbContext.LibraryHoursExceptions
            .Where(x => x.LibraryId == libraryId && !x.IsDeleted)
            .ToListAsync(cancellationToken);

        var today = LibraryOverviewHelper.TodayDateOnly();

        foreach (var exception in request.Exceptions)
        {
            var validationError = LibraryOverviewHelper.ValidateHoursException(exception);
            if (validationError is not null)
            {
                throw new InvalidOperationException(validationError);
            }

            if (!exception.Id.HasValue)
            {
                continue;
            }

            var existing = existingRows.FirstOrDefault(x => x.Id == exception.Id.Value);
            if (existing is null || !LibraryOverviewHelper.IsPastHoursException(existing.EndDate, today))
            {
                continue;
            }

            if (!LibraryOverviewHelper.HoursExceptionMatchesRequest(existing, exception))
            {
                throw new InvalidOperationException("Past exceptions cannot be modified.");
            }
        }

        foreach (var exception in request.Exceptions)
        {
            if (!DateOnly.TryParse(exception.StartDate, out var startDate)
                || !DateOnly.TryParse(exception.EndDate, out var endDate))
            {
                continue;
            }

            var existing = exception.Id.HasValue
                ? existingRows.FirstOrDefault(x => x.Id == exception.Id.Value)
                : null;

            if (existing is not null && LibraryOverviewHelper.IsPastHoursException(existing.EndDate, today))
            {
                continue;
            }

            if (existing is null)
            {
                if (LibraryOverviewHelper.IsPastHoursException(startDate, today)
                    || LibraryOverviewHelper.IsPastHoursException(endDate, today))
                {
                    throw new InvalidOperationException("Exception dates must be today or later.");
                }

                continue;
            }

            if (LibraryOverviewHelper.IsPastHoursException(endDate, today))
            {
                throw new InvalidOperationException("Exception end date must be today or later.");
            }

            if (startDate < today && startDate != existing.StartDate)
            {
                throw new InvalidOperationException("Start date cannot be set to a past date.");
            }
        }

        var requestedIds = request.Exceptions
            .Where(x => x.Id.HasValue)
            .Select(x => x.Id!.Value)
            .ToHashSet();

        foreach (var row in existingRows)
        {
            if (requestedIds.Contains(row.Id))
            {
                continue;
            }

            if (LibraryOverviewHelper.IsPastHoursException(row.EndDate, today))
            {
                throw new InvalidOperationException("Past exceptions cannot be deleted.");
            }

            row.IsDeleted = true;
            row.DeletedAtUtc = DateTime.UtcNow;
            row.UpdatedAtUtc = DateTime.UtcNow;
            row.UpdatedBy = userId;
        }

        foreach (var exception in request.Exceptions)
        {
            var startDate = DateOnly.Parse(exception.StartDate);
            var endDate = DateOnly.Parse(exception.EndDate);
            var openTime = exception.Closed ? null : LibraryOverviewHelper.ParseTime(exception.Open);
            var closeTime = exception.Closed ? null : LibraryOverviewHelper.ParseTime(exception.Close);

            if (exception.Id.HasValue)
            {
                var existing = existingRows.FirstOrDefault(x => x.Id == exception.Id.Value);
                if (existing is not null)
                {
                    if (LibraryOverviewHelper.IsPastHoursException(existing.EndDate, today))
                    {
                        continue;
                    }

                    existing.Name = exception.Name.Trim();
                    existing.StartDate = startDate;
                    existing.EndDate = endDate;
                    existing.Closed = exception.Closed;
                    existing.OpenTime = openTime;
                    existing.CloseTime = closeTime;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                    existing.UpdatedBy = userId;
                    continue;
                }
            }

            _dbContext.LibraryHoursExceptions.Add(new LibraryHoursException
            {
                Id = exception.Id ?? Guid.NewGuid(),
                LibraryId = libraryId,
                Name = exception.Name.Trim(),
                StartDate = startDate,
                EndDate = endDate,
                Closed = exception.Closed,
                OpenTime = openTime,
                CloseTime = closeTime,
                CreatedBy = userId,
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await LibraryOverviewHelper.LoadHoursExceptionsAsync(
            _dbContext,
            libraryId,
            cancellationToken);
    }

    public async Task DeleteAsync(Guid institutionId, Guid branchId, Guid libraryId, string? userId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        var entity = await _dbContext.Libraries
          .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Id == libraryId && !x.IsDeleted, cancellationToken)
          ?? throw new InvalidOperationException("Library not found.");

        entity.IsDeleted = true;
        entity.DeletedAtUtc = DateTime.UtcNow;
        entity.IsActive = false;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureLibraryExistsAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        var exists = await _dbContext.Libraries
            .AnyAsync(x => x.InstitutionId == institutionId
                           && x.BranchId == branchId
                           && x.Id == libraryId
                           && !x.IsDeleted,
                cancellationToken);

        if (!exists)
        {
            throw new InvalidOperationException("Library not found.");
        }
    }

    private async Task EnsureBranchExistsAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Branches
          .AnyAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken);
        if (!exists)
        {
            throw new InvalidOperationException("Branch not found.");
        }
    }

    private static LibraryResponse ToResponse(Library entity) =>
  new()
  {
      Id = entity.Id,
      BranchId = entity.BranchId,
      Name = entity.Name,
      Description = entity.Description,
      Floor = entity.Floor,
      Capacity = entity.Capacity,
      IsActive = entity.IsActive,
      CreatedAtUtc = entity.CreatedAtUtc,
      Status = entity.Status,
  };

    private async Task CreateDefaultPlansAsync(Guid institutionId, Guid branchId, Library library,string userId, CancellationToken cancellationToken)
    {
        var defaultPlans = new List<CreatePlanRequest>
    {
      new ()
      {
        Name = "Monthly",
          Description = "30 Days Access",
          Price = 800,
          DurationInDays = 30,
          MaxSeats = library.Capacity,
          IsActive = true
      },
      new ()
      {
        Name = "Quarterly",
          Description = "90 Days Access",
          Price = 2200,
          DurationInDays = 90,
          MaxSeats = library.Capacity,
          IsActive = true
      },
      new ()
      {
        Name = "Half Yearly",
          Description = "180 Days Access",
          Price = 4200,
          DurationInDays = 180,
          MaxSeats = library.Capacity,
          IsActive = true
      },
      new ()
      {
        Name = "Yearly",
          Description = "365 Days Access",
          Price = 8000,
          DurationInDays = 365,
          MaxSeats = library.Capacity,
          IsActive = true
      }
    };
        await _planService.BulkCreateAsync(institutionId, branchId, library.Id, defaultPlans, userId, cancellationToken);

    }
}
