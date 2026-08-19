using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public sealed class InstitutionMemberMixStats
{
    public int EnrolledCount { get; init; }
    public int Active { get; init; }
    public int Inactive { get; init; }
    public int Suspended { get; init; }
}

public sealed class InstitutionBranchStats
{
    public int MemberCount { get; init; }
    public decimal OccupancyPercent { get; init; }
}

public static class InstitutionStatsHelper
{
    public static async Task<int> GetEnrolledMemberCountAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        return await dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && x.InstitutionId == institutionId)
            .Select(x => x.MemberId)
            .Distinct()
            .CountAsync(cancellationToken);
    }

    public static async Task<InstitutionMemberMixStats> GetMemberMixAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var members = await dbContext.Members
            .AsNoTracking()
            .Where(m => !m.IsDeleted &&
                        m.MemberLibraries.Any(ml =>
                            !ml.IsDeleted && ml.IsCurrent && ml.InstitutionId == institutionId))
            .Select(m => new
            {
                m.IsActive,
                PlanEndDate = m.MemberPlans
                    .Where(mp => mp.IsCurrent && mp.IsActive && !mp.IsDeleted)
                    .Select(mp => (DateOnly?)mp.EndDate)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var active = 0;
        var inactive = 0;
        var suspended = 0;

        foreach (var member in members)
        {
            if (!member.IsActive)
            {
                inactive++;
                continue;
            }

            if (member.PlanEndDate is null)
            {
                suspended++;
                continue;
            }

            if (member.PlanEndDate.Value >= today)
            {
                active++;
            }
            else
            {
                suspended++;
            }
        }

        return new InstitutionMemberMixStats
        {
            EnrolledCount = members.Count,
            Active = active,
            Inactive = inactive,
            Suspended = suspended
        };
    }

    public static async Task<Dictionary<Guid, InstitutionBranchStats>> GetBranchStatsAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        IReadOnlyCollection<Guid> branchIds,
        CancellationToken cancellationToken)
        => await GetBranchStatsAsync(dbContext, branchIds, cancellationToken);

    public static async Task<Dictionary<Guid, InstitutionBranchStats>> GetBranchStatsAsync(
        ApplicationDbContext dbContext,
        IReadOnlyCollection<Guid> branchIds,
        CancellationToken cancellationToken)
    {
        if (branchIds.Count == 0)
        {
            return new Dictionary<Guid, InstitutionBranchStats>();
        }

        var memberCounts = await dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && branchIds.Contains(x.BranchId))
            .GroupBy(x => x.BranchId)
            .Select(g => new
            {
                BranchId = g.Key,
                MemberCount = g.Select(x => x.MemberId).Distinct().Count()
            })
            .ToDictionaryAsync(x => x.BranchId, x => x.MemberCount, cancellationToken);

        var capacities = await dbContext.Branches
            .AsNoTracking()
            .Where(x => branchIds.Contains(x.Id))
            .Select(x => new { x.Id, Capacity = x.Capacity ?? 0 })
            .ToDictionaryAsync(x => x.Id, x => x.Capacity, cancellationToken);

        return branchIds.ToDictionary(
            id => id,
            id =>
            {
                memberCounts.TryGetValue(id, out var memberCount);
                capacities.TryGetValue(id, out var capacity);
                var occupancyPercent = capacity > 0
                    ? Math.Round((decimal)memberCount / capacity * 100m, 1)
                    : 0m;

                return new InstitutionBranchStats
                {
                    MemberCount = memberCount,
                    OccupancyPercent = occupancyPercent
                };
            });
    }

    public static async Task<Dictionary<Guid, int>> GetLibraryMemberCountsAsync(
        ApplicationDbContext dbContext,
        IReadOnlyCollection<Guid> libraryIds,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return new Dictionary<Guid, int>();
        }

        return await GetLibraryMemberCountsAsync(
            dbContext,
            dbContext.Libraries.AsNoTracking().Where(x => libraryIds.Contains(x.Id)).Select(x => x.Id),
            cancellationToken);
    }

    public static async Task<Dictionary<Guid, int>> GetLibraryMemberCountsAsync(
        ApplicationDbContext dbContext,
        IQueryable<Guid> scopedLibraryIds,
        CancellationToken cancellationToken)
    {
        return await dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && scopedLibraryIds.Contains(x.LibraryId))
            .GroupBy(x => x.LibraryId)
            .Select(g => new
            {
                LibraryId = g.Key,
                MemberCount = g.Count(),
            })
            .ToDictionaryAsync(x => x.LibraryId, x => x.MemberCount, cancellationToken);
    }

    public static async Task<int> GetLibraryCountAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        return await (
            from lib in dbContext.Libraries.AsNoTracking()
            join br in dbContext.Branches.AsNoTracking() on lib.BranchId equals br.Id
            where !lib.IsDeleted && !br.IsDeleted && br.InstitutionId == institutionId
            select lib.Id
        ).CountAsync(cancellationToken);
    }

    public static async Task<int> GetTotalBranchCapacityAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == institutionId && !x.IsDeleted)
            .SumAsync(x => x.Capacity ?? 0, cancellationToken);
    }

    public static async Task<IReadOnlyCollection<InstitutionBillingInvoiceResponse>> GetBillingInvoicesAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        int take,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from mp in dbContext.MemberPlans.AsNoTracking()
            join ml in dbContext.MemberLibraries.AsNoTracking() on mp.MemberId equals ml.MemberId
            join member in dbContext.Members.AsNoTracking() on mp.MemberId equals member.Id
            join p in dbContext.Plans.AsNoTracking() on mp.PlanId equals p.Id
            where !mp.IsDeleted
                  && !ml.IsDeleted
                  && !member.IsDeleted
                  && ml.InstitutionId == institutionId
                  && mp.PaidAmount > 0
            orderby mp.CreatedAtUtc descending
            select new
            {
                mp.Id,
                mp.MemberId,
                mp.CreatedAtUtc,
                mp.UpdatedAtUtc,
                mp.StartDate,
                mp.EndDate,
                mp.PaidAmount,
                PlanName = p.Name,
                MemberName = member.FullName
            }
        ).Take(take).ToListAsync(cancellationToken);

        return rows.Select((row, index) => new InstitutionBillingInvoiceResponse
        {
            Id = row.Id,
            MemberId = row.MemberId,
            MemberName = row.MemberName,
            Number = $"INV-{row.CreatedAtUtc:yyyyMM}-{index + 1:D4}",
            IssuedAtUtc = row.CreatedAtUtc,
            PaidAtUtc = row.UpdatedAtUtc ?? row.CreatedAtUtc,
            PlanStartDate = row.StartDate,
            PlanEndDate = row.EndDate,
            Amount = row.PaidAmount,
            Status = "paid",
            PlanName = row.PlanName,
            Description = $"{row.PlanName} membership payment"
        }).ToList();
    }
}
