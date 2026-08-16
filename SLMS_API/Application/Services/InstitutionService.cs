using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class InstitutionService : IInstitutionService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuthService _authService;
    public InstitutionService(ApplicationDbContext dbContext, IAuthService authService)
    {
        _dbContext = dbContext;
        _authService = authService;
    }


    public async Task<InstitutionResponse> CreateAsync(CreateInstitutionRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var emailExists = await _dbContext.Institutions
                .AnyAsync(x => !x.IsDeleted && x.Email == request.Email, cancellationToken);
            if (emailExists)
            {
                throw new InvalidOperationException("An institution with this email already exists.");
            }
        }

        var entity = new Institution
        {
            Name = request.Name,
            Description = request.Description,
            Type = request.Type,
            Email = request.Email,
            Phone = request.Phone,
            WebsiteUrl = request.WebsiteUrl,
            LogoUrl = request.LogoUrl,
            Address = request.Address,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            Country = request.Country,
            TimeZone = request.TimeZone,
            IsActive = request.IsActive,
            Status = request.Status,
            CreatedBy = userId.ToString()
        };

        _dbContext.Institutions.Add(entity);

        // Assign the creator to the institution
        _dbContext.UserInstitutions.Add(new UserInstitution
        {
            UserId = userId.ToString(),
            Institution = entity,   // EF will set InstitutionId automatically
            IsPrimary = request.IsPrimary,
            IsActive = true,
            AssignedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        if (request.IsOnboarding)
        {
            await _authService.UpdateOnboardingStepAsync(userId.ToString(), OnboardingStep.Institute, cancellationToken);
        }       

        return ToResponse(entity);
    }

    public async Task<InstitutionCardResponse?> GetInstitutionByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var institution = await _dbContext.UserInstitutions
        .AsNoTracking()
        .Where(x => x.UserId == userId.ToString() && x.IsActive)
        .Select(x => x.Institution)
        .FirstOrDefaultAsync(x => x.IsActive && !x.IsDeleted, cancellationToken);

        if (institution == null) return null;

        var branchStats = await _dbContext.Branches.AsNoTracking()
            .Where(x => !x.IsDeleted && x.InstitutionId == institution.Id)
            .GroupBy(x => x.InstitutionId)
            .Select(g => new
            {
                BranchCount = g.Count(),
                ActiveBranchCount = g.Count(x => x.IsActive),
                TotalCapacity = g.Sum(x => x.Capacity ?? 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var libraryCount = await _dbContext.Libraries
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted, cancellationToken);

        return new InstitutionCardResponse
        {
            Id = institution.Id,
            Code = InstitutionUiHelper.ToCode(institution.Id),
            Name = institution.Name,
            Initials = InstitutionUiHelper.ToInitials(institution.Name),
            Type = institution.Type,
            Location = InstitutionUiHelper.ToLocation(institution),
            Status = InstitutionUiHelper.ToStatusLabel(institution.IsActive),
            UpdateCount = InstitutionUiHelper.GetUpdateCount(
                institution.CreatedAtUtc,
                institution.UpdatedAtUtc),
            OccupancyPercent = 0,
            BranchCount = branchStats?.BranchCount ?? 0,
            MemberCount = 0,
            Revenue = 0,
            HealthStatus = InstitutionUiHelper.ToHealthStatus(
                institution.IsActive,
                branchStats?.BranchCount ?? 0),
            LogoUrl = institution.LogoUrl,
            IsActive = institution.IsActive
        };
    }

    public async Task<IReadOnlyCollection<InstitutionResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Institutions
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => ToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<InstitutionListViewResponse> GetListViewAsync(InstitutionListQuery query, Guid userId, CancellationToken cancellationToken = default)
    {
        var userIdString = userId.ToString();
        var nowUtc = DateTime.UtcNow;

        var institutionsQuery = _dbContext.Institutions
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Where(x => x.UserInstitutions.Any(ui => ui.UserId == userIdString && ui.IsActive));

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            institutionsQuery = institutionsQuery.Where(x =>
                x.Name.Contains(search) ||
                (x.City != null && x.City.Contains(search)) ||
                (x.Type != null && x.Type.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Type) && !query.Type.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var type = query.Type.Trim();
            institutionsQuery = institutionsQuery.Where(x => x.Type != null && x.Type.Contains(type));
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && !query.Status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var isActive = query.Status.Equals("active", StringComparison.OrdinalIgnoreCase);
            institutionsQuery = institutionsQuery.Where(x => x.IsActive == isActive);
        }

        var institutions = await institutionsQuery
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var institutionIds = institutions.Select(x => x.Id).ToList();

        var branchStats = institutionIds.Count == 0
            ? new Dictionary<Guid, (int BranchCount, int ActiveBranchCount, int TotalCapacity)>()
            : await _dbContext.Branches
                .AsNoTracking()
                .Where(x => !x.IsDeleted && institutionIds.Contains(x.InstitutionId))
                .GroupBy(x => x.InstitutionId)
                .Select(g => new
                {
                    InstitutionId = g.Key,
                    BranchCount = g.Count(),
                    ActiveBranchCount = g.Count(x => x.IsActive),
                    TotalCapacity = g.Sum(x => x.Capacity ?? 0)
                })
                .ToDictionaryAsync(
                    x => x.InstitutionId,
                    x => (x.BranchCount, x.ActiveBranchCount, x.TotalCapacity),
                    cancellationToken);

        var memberStats = institutionIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.MemberLibraries
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsCurrent && institutionIds.Contains(x.InstitutionId))
                .GroupBy(x => x.InstitutionId)
                .Select(g => new
                {
                    InstitutionId = g.Key,
                    MemberCount = g.Select(x => x.MemberId).Distinct().Count()
                })
                .ToDictionaryAsync(x => x.InstitutionId, x => x.MemberCount, cancellationToken);

        var planRevenueRows = institutionIds.Count == 0
            ? []
            : await (
                from mp in _dbContext.MemberPlans.AsNoTracking()
                join ml in _dbContext.MemberLibraries.AsNoTracking() on mp.MemberId equals ml.MemberId
                where !mp.IsDeleted && !ml.IsDeleted && ml.IsCurrent && institutionIds.Contains(ml.InstitutionId)
                select new { ml.InstitutionId, mp.PaidAmount, mp.CreatedAtUtc }
            ).ToListAsync(cancellationToken);

        var revenueByInstitution = InstitutionRevenueHelper.AggregateByInstitution(
            planRevenueRows.Select(x => (x.InstitutionId, x.PaidAmount, x.CreatedAtUtc)),
            nowUtc);

        var globalBranchCount = branchStats.Values.Sum(x => x.BranchCount);
        var globalMemberCount = memberStats.Values.Sum();

        var globalLibraryCount = institutionIds.Count == 0
            ? 0
            : await (
                from lib in _dbContext.Libraries.AsNoTracking()
                join br in _dbContext.Branches.AsNoTracking() on lib.BranchId equals br.Id
                where !lib.IsDeleted && !br.IsDeleted && institutionIds.Contains(br.InstitutionId)
                select lib.Id
            ).CountAsync(cancellationToken);

        var items = institutions.Select(entity =>
        {
            branchStats.TryGetValue(entity.Id, out var branches);
            memberStats.TryGetValue(entity.Id, out var memberCount);
            revenueByInstitution.TryGetValue(entity.Id, out var revenue);
            revenue ??= InstitutionRevenueMetrics.Empty;

            var branchCount = branches.BranchCount;
            var totalCapacity = branches.TotalCapacity;
            var occupancyPercent = totalCapacity > 0
                ? Math.Round((decimal)memberCount / totalCapacity * 100m, 1)
                : 0m;

            return new InstitutionCardResponse
            {
                Id = entity.Id,
                Code = InstitutionUiHelper.ToCode(entity.Id),
                Name = entity.Name,
                Initials = InstitutionUiHelper.ToInitials(entity.Name),
                Type = entity.Type,
                Location = InstitutionUiHelper.ToLocation(entity),
                Status = InstitutionUiHelper.ToStatusLabel(entity.IsActive),
                UpdateCount = InstitutionUiHelper.GetUpdateCount(entity.CreatedAtUtc, entity.UpdatedAtUtc),
                OccupancyPercent = occupancyPercent,
                BranchCount = branchCount,
                MemberCount = memberCount,
                Revenue = revenue.AllTime,
                HealthStatus = InstitutionUiHelper.ToHealthStatus(entity.IsActive, branchCount),
                LogoUrl = entity.LogoUrl,
                IsActive = entity.IsActive
            };
        }).ToList();

        var avgOccupancy = items.Count > 0
            ? Math.Round(items.Average(x => x.OccupancyPercent), 1)
            : 0m;

        var summaryRevenue = revenueByInstitution.Count > 0
            ? InstitutionRevenueMetrics.Sum(revenueByInstitution.Values)
            : InstitutionRevenueMetrics.Empty;

        return new InstitutionListViewResponse
        {
            Summary = new InstitutionListSummaryResponse
            {
                TotalInstitutions = items.Count,
                TotalBranches = globalBranchCount,
                TotalLibraries = globalLibraryCount,
                TotalMembers = globalMemberCount,
                RevenueMtd = summaryRevenue.Mtd,
                RevenuePreviousMtd = summaryRevenue.PreviousMtd,
                RevenueMonthly = summaryRevenue.Monthly,
                RevenueQuarterly = summaryRevenue.Quarterly,
                RevenueYearly = summaryRevenue.Yearly,
                RevenueAllTime = summaryRevenue.AllTime,
                AverageOccupancyPercent = avgOccupancy
            },
            Items = items
        };
    }

    public async Task<InstitutionOverviewResponse?> GetOverviewAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Institutions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        var activeBranchCount = await _dbContext.Branches
            .CountAsync(x => x.InstitutionId == id && !x.IsDeleted && x.IsActive, cancellationToken);

        var totalLibraryCount = await _dbContext.Libraries
            .CountAsync(x => !x.IsDeleted, cancellationToken);

        var branchCapacity = await _dbContext.Branches
            .Where(x => x.InstitutionId == id && !x.IsDeleted)
            .SumAsync(x => x.Capacity ?? 0, cancellationToken);

        var libraryCapacity = await _dbContext.Libraries
            .Where(x => !x.IsDeleted)
            .SumAsync(x => x.Capacity ?? 0, cancellationToken);

        var totalSeats = branchCapacity + libraryCapacity;

        return new InstitutionOverviewResponse
        {
            Id = entity.Id,
            Code = InstitutionUiHelper.ToCode(entity.Id),
            Name = entity.Name,
            Type = entity.Type,
            Location = InstitutionUiHelper.ToLocation(entity),
            Status = InstitutionUiHelper.ToStatusLabel(entity.IsActive),
            IsActive = entity.IsActive,
            ActiveBranchCount = activeBranchCount,
            TotalLibraryCount = totalLibraryCount,
            EnrolledMemberCount = 0,
            OccupiedSeats = 0,
            TotalSeats = totalSeats,
            OccupancyPercent = 0,
            CapacityUtilization = new InstitutionCapacityUtilizationResponse
            {
                TotalSeats = totalSeats,
                CurrentMembers = 0,
                TotalLibraries = totalLibraryCount
            },
            MemberMix = new InstitutionMemberMixResponse()
        };
    }

    public async Task<InstitutionBranchesViewResponse?> GetBranchesViewAsync(
        Guid id,
        InstitutionBranchListQuery query,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Institutions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        var branchesQuery = _dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == id && !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            branchesQuery = branchesQuery.Where(x =>
                x.Name.Contains(search) ||
                (x.City != null && x.City.Contains(search)) ||
                (x.Address != null && x.Address.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && !query.Status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Status.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                branchesQuery = branchesQuery.Where(x => x.IsActive);
            }
            else if (query.Status.Equals("inactive", StringComparison.OrdinalIgnoreCase) ||
                     query.Status.Equals("closed", StringComparison.OrdinalIgnoreCase) ||
                     query.Status.Equals("maintenance", StringComparison.OrdinalIgnoreCase))
            {
                branchesQuery = branchesQuery.Where(x => !x.IsActive);
            }
        }

        if (!string.IsNullOrWhiteSpace(query.Size) && !query.Size.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            branchesQuery = query.Size.ToLowerInvariant() switch
            {
                "<50" or "lt50" or "small" => branchesQuery.Where(x => (x.Capacity ?? 0) < 50),
                "50-150" or "medium" => branchesQuery.Where(x => (x.Capacity ?? 0) >= 50 && (x.Capacity ?? 0) <= 150),
                "150+" or "gt150" or "large" => branchesQuery.Where(x => (x.Capacity ?? 0) > 150),
                _ => branchesQuery
            };
        }

        var branches = await branchesQuery
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var branchIds = branches.Select(x => x.Id).ToList();

        var libraryCounts = await _dbContext.Libraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && branchIds.Contains(x.BranchId))
            .GroupBy(x => x.BranchId)
            .Select(g => new { BranchId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BranchId, x => x.Count, cancellationToken);

        var branchCards = branches.Select(branch =>
        {
            libraryCounts.TryGetValue(branch.Id, out var libraryCount);

            return new InstitutionBranchCardResponse
            {
                Id = branch.Id,
                Name = branch.Name,
                City = branch.City,
                Contact = entity.Phone,
                Capacity = branch.Capacity ?? 0,
                OccupancyPercent = 0,
                LibraryCount = libraryCount,
                MemberCount = 0,
                Status = InstitutionUiHelper.ToStatusLabel(branch.IsActive),
                IsActive = branch.IsActive
            };
        }).ToList();

        var totalCapacity = branchCards.Sum(x => x.Capacity);
        var activeBranches = branchCards.Count(x => x.IsActive);

        var insights = branchCards
            .Select(x => new InstitutionBranchInsightResponse
            {
                BranchId = x.Id,
                Name = x.Name,
                OccupancyPercent = x.OccupancyPercent,
                MemberCount = x.MemberCount,
                LibraryCount = x.LibraryCount,
                Capacity = x.Capacity
            })
            .ToList();

        var topPerformer = insights
            .OrderByDescending(x => x.OccupancyPercent)
            .ThenByDescending(x => x.MemberCount)
            .FirstOrDefault();

        var needsAttention = insights
            .OrderBy(x => x.OccupancyPercent)
            .ThenBy(x => x.MemberCount)
            .Take(3)
            .ToList();

        return new InstitutionBranchesViewResponse
        {
            InstitutionId = entity.Id,
            InstitutionName = entity.Name,
            Code = InstitutionUiHelper.ToCode(entity.Id),
            Type = entity.Type,
            Location = InstitutionUiHelper.ToLocation(entity),
            Summary = new InstitutionBranchSummaryResponse
            {
                TotalBranches = branchCards.Count,
                ActiveBranches = activeBranches,
                TotalCapacity = totalCapacity,
                AverageOccupancyPercent = 0,
                NearCapacityCount = branchCards.Count(x => x.OccupancyPercent >= 80)
            },
            Branches = branchCards,
            TopPerformer = topPerformer,
            NeedsAttention = needsAttention
        };
    }

    public async Task<InstitutionResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Institutions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        return entity is null ? null : ToResponse(entity);
    }

    public async Task<InstitutionResponse> UpdateAsync(Guid id, UpdateInstitutionRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Institutions
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Institution not found.");

        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != entity.Email)
        {
            var emailExists = await _dbContext.Institutions
                .AnyAsync(x => !x.IsDeleted && x.Email == request.Email && x.Id != id, cancellationToken);
            if (emailExists)
            {
                throw new InvalidOperationException("An institution with this email already exists.");
            }
        }

        if (request.Name is not null) entity.Name = request.Name;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.Type is not null) entity.Type = request.Type;
        if (request.Email is not null) entity.Email = request.Email;
        if (request.Phone is not null) entity.Phone = request.Phone;
        if (request.WebsiteUrl is not null) entity.WebsiteUrl = request.WebsiteUrl;
        if (request.LogoUrl is not null) entity.LogoUrl = request.LogoUrl;
        if (request.Address is not null) entity.Address = request.Address;
        if (request.City is not null) entity.City = request.City;
        if (request.State is not null) entity.State = request.State;
        if (request.PostalCode is not null) entity.PostalCode = request.PostalCode;
        if (request.Country is not null) entity.Country = request.Country;
        if (request.TimeZone is not null) entity.TimeZone = request.TimeZone;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;

        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteAsync(Guid id, string? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Institutions
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Institution not found.");

        entity.IsDeleted = true;
        entity.DeletedAtUtc = DateTime.UtcNow;
        entity.IsActive = false;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<OrganizationAnalyticsResponse> GetAnalyticsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var exists = await _dbContext.Institutions.AnyAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (!exists)
        {
            throw new InvalidOperationException("Institution not found.");
        }

        var branchCount = await _dbContext.Branches.CountAsync(x => x.InstitutionId == id && !x.IsDeleted, cancellationToken);
        var activeBranchCount = await _dbContext.Branches.CountAsync(x => x.InstitutionId == id && !x.IsDeleted && x.IsActive, cancellationToken);
        var libraryCount = await _dbContext.Libraries.CountAsync(x => !x.IsDeleted, cancellationToken);
        var activeLibraryCount = await _dbContext.Libraries.CountAsync(x => !x.IsDeleted && x.IsActive, cancellationToken);

        return new OrganizationAnalyticsResponse
        {
            BranchCount = branchCount,
            ActiveBranchCount = activeBranchCount,
            LibraryCount = libraryCount,
            ActiveLibraryCount = activeLibraryCount
        };
    }

    public async Task<List<InstitutionDropdownResponse>> GetInstitutionDropdownAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var userIdString = userId.ToString();

         var institutions = await _dbContext.UserInstitutions
            .AsNoTracking()
            .Where(x => x.UserId == userIdString && x.IsActive)
            .Include(x => x.Institution)
            .ToListAsync(cancellationToken);

        var branches = await _dbContext.UserBranches
            .AsNoTracking()
            .Where(x => x.UserId == userIdString && x.IsActive)
            .Include(x => x.Branch)
            .ToListAsync(cancellationToken);

        var libraries = await _dbContext.UserLibraries
            .AsNoTracking()
            .Where(x => x.UserId == userIdString && x.IsActive)
            .Include(x => x.Library)
            .ToListAsync(cancellationToken);

        var plans = await _dbContext.Plans
            .AsNoTracking()
            .Where(x => x.IsActive)
            .ToListAsync(cancellationToken);

        return institutions
            .OrderBy(x => x.Institution.Name)
            .Select(i => new InstitutionDropdownResponse
            {
                Value = i.InstitutionId,
                Key = i.Institution.Name,

                Branches = branches
                    .Where(b => b.InstitutionId == i.InstitutionId)
                    .OrderBy(b => b.Branch.Name)
                    .Select(b => new BranchDropdownResponse
                    {
                        Value = b.BranchId,
                        Key = b.Branch.Name,

                        Libraries = libraries
                            .Where(l => l.BranchId == b.BranchId)
                            .OrderBy(l => l.Library.Name)
                            .Select(l => new LibraryDropdownResponse
                            {
                                Value = l.LibraryId,
                                Key = l.Library.Name,
                                Plans = plans
                                    .Where(p => p.LibraryId == l.LibraryId)
                                    .OrderBy(p => p.Name)
                                    .Select(p => new PlanDropdownResponse
                                    {
                                        Value = p.Id,
                                        Key = p.Name
                                    })
                                    .ToList()
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .ToList();
    }

    private static InstitutionResponse ToResponse(Institution entity) =>
        new()
        {
            Id = entity.Id,
            Name = entity.Name,
            Description = entity.Description,
            Type = entity.Type,
            Email = entity.Email,
            Phone = entity.Phone,
            WebsiteUrl = entity.WebsiteUrl,
            LogoUrl = entity.LogoUrl,
            Address = entity.Address,
            City = entity.City,
            State = entity.State,
            PostalCode = entity.PostalCode,
            Country = entity.Country,
            TimeZone = entity.TimeZone,
            IsActive = entity.IsActive,
            CreatedAtUtc = entity.CreatedAtUtc,
            UpdatedBy = entity.UpdatedBy,
            CreatedBy = entity.CreatedBy,
            UpdatedAtUtc = entity.UpdatedAtUtc,
            IsDeleted = entity.IsDeleted,
            DeletedAtUtc = entity.DeletedAtUtc,
            Status = entity.Status,
        };
}
