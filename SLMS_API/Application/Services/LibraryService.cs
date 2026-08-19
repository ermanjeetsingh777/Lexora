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

        var library = new Library
        {
            BranchId = branchId,
            InstitutionId = institutionId,
            Name = request.Name,
            Description = request.Description,
            Address = request.Address,
            Floor = request.Floor,
            Capacity = request.Capacity,
            IsActive = request.IsActive,
            CreatedBy = userId,
            Status = request.Status,
        };

        _dbContext.Libraries.Add(library);
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

        if (request.Name is not null) entity.Name = request.Name;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.Floor.HasValue) entity.Floor = request.Floor;
        if (request.Capacity.HasValue) entity.Capacity = request.Capacity;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;

        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
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
