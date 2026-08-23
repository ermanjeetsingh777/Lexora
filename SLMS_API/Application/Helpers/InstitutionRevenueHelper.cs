using Microsoft.EntityFrameworkCore;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public sealed class InstitutionRevenueMetrics
{
    public decimal AllTime { get; init; }
    public decimal Mtd { get; init; }
    public decimal PreviousMtd { get; init; }
    public decimal Monthly { get; init; }
    public decimal Quarterly { get; init; }
    public decimal Yearly { get; init; }

    public static InstitutionRevenueMetrics Empty { get; } = new();

    public static InstitutionRevenueMetrics Sum(IEnumerable<InstitutionRevenueMetrics> items)
    {
        return new InstitutionRevenueMetrics
        {
            AllTime = items.Sum(x => x.AllTime),
            Mtd = items.Sum(x => x.Mtd),
            PreviousMtd = items.Sum(x => x.PreviousMtd),
            Monthly = items.Sum(x => x.Monthly),
            Quarterly = items.Sum(x => x.Quarterly),
            Yearly = items.Sum(x => x.Yearly)
        };
    }
}

public static class InstitutionRevenueHelper
{
    public static (DateTime MonthStart, DateTime PreviousMonthStart, DateTime QuarterStart, DateTime YearStart) GetPeriodStartsUtc(DateTime nowUtc)
    {
        var monthStart = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var previousMonthStart = monthStart.AddMonths(-1);
        var quarterMonth = ((nowUtc.Month - 1) / 3) * 3 + 1;
        var quarterStart = new DateTime(nowUtc.Year, quarterMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var yearStart = new DateTime(nowUtc.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        return (monthStart, previousMonthStart, quarterStart, yearStart);
    }

    public static Dictionary<Guid, InstitutionRevenueMetrics> AggregateByInstitution(
        IEnumerable<(Guid InstitutionId, decimal PaidAmount, DateTime CreatedAtUtc)> rows,
        DateTime nowUtc)
    {
        var (monthStart, previousMonthStart, quarterStart, yearStart) = GetPeriodStartsUtc(nowUtc);

        return rows
            .GroupBy(x => x.InstitutionId)
            .ToDictionary(
                g => g.Key,
                g => new InstitutionRevenueMetrics
                {
                    AllTime = g.Sum(x => x.PaidAmount),
                    Mtd = g.Where(x => x.CreatedAtUtc >= monthStart).Sum(x => x.PaidAmount),
                    PreviousMtd = g.Where(x => x.CreatedAtUtc >= previousMonthStart && x.CreatedAtUtc < monthStart).Sum(x => x.PaidAmount),
                    Monthly = g.Where(x => x.CreatedAtUtc >= monthStart).Sum(x => x.PaidAmount),
                    Quarterly = g.Where(x => x.CreatedAtUtc >= quarterStart).Sum(x => x.PaidAmount),
                    Yearly = g.Where(x => x.CreatedAtUtc >= yearStart).Sum(x => x.PaidAmount)
                });
    }

    public static Dictionary<Guid, InstitutionRevenueMetrics> AggregateByBranch(
        IEnumerable<(Guid BranchId, decimal PaidAmount, DateTime CreatedAtUtc)> rows,
        DateTime nowUtc)
    {
        var (monthStart, previousMonthStart, quarterStart, yearStart) = GetPeriodStartsUtc(nowUtc);

        return rows
            .GroupBy(x => x.BranchId)
            .ToDictionary(
                g => g.Key,
                g => new InstitutionRevenueMetrics
                {
                    AllTime = g.Sum(x => x.PaidAmount),
                    Mtd = g.Where(x => x.CreatedAtUtc >= monthStart).Sum(x => x.PaidAmount),
                    PreviousMtd = g.Where(x => x.CreatedAtUtc >= previousMonthStart && x.CreatedAtUtc < monthStart).Sum(x => x.PaidAmount),
                    Monthly = g.Where(x => x.CreatedAtUtc >= monthStart).Sum(x => x.PaidAmount),
                    Quarterly = g.Where(x => x.CreatedAtUtc >= quarterStart).Sum(x => x.PaidAmount),
                    Yearly = g.Where(x => x.CreatedAtUtc >= yearStart).Sum(x => x.PaidAmount)
                });
    }

    public static Dictionary<Guid, InstitutionRevenueMetrics> AggregateByLibrary(
        IEnumerable<(Guid LibraryId, decimal PaidAmount, DateTime CreatedAtUtc)> rows,
        DateTime nowUtc)
    {
        var (monthStart, previousMonthStart, quarterStart, yearStart) = GetPeriodStartsUtc(nowUtc);

        return rows
            .GroupBy(x => x.LibraryId)
            .ToDictionary(
                g => g.Key,
                g => new InstitutionRevenueMetrics
                {
                    AllTime = g.Sum(x => x.PaidAmount),
                    Mtd = g.Where(x => x.CreatedAtUtc >= monthStart).Sum(x => x.PaidAmount),
                    PreviousMtd = g.Where(x => x.CreatedAtUtc >= previousMonthStart && x.CreatedAtUtc < monthStart).Sum(x => x.PaidAmount),
                    Monthly = g.Where(x => x.CreatedAtUtc >= monthStart).Sum(x => x.PaidAmount),
                    Quarterly = g.Where(x => x.CreatedAtUtc >= quarterStart).Sum(x => x.PaidAmount),
                    Yearly = g.Where(x => x.CreatedAtUtc >= yearStart).Sum(x => x.PaidAmount)
                });
    }

    public static Dictionary<Guid, decimal> AggregateByBranchFrom(
        IEnumerable<(Guid BranchId, decimal PaidAmount, DateTime CreatedAtUtc)> rows,
        DateTime rangeStartUtc)
    {
        return rows
            .Where(x => x.CreatedAtUtc >= rangeStartUtc)
            .GroupBy(x => x.BranchId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.PaidAmount));
    }

    public static Dictionary<Guid, decimal> AggregateByLibraryFrom(
        IEnumerable<(Guid LibraryId, decimal PaidAmount, DateTime CreatedAtUtc)> rows,
        DateTime rangeStartUtc)
    {
        return rows
            .Where(x => x.CreatedAtUtc >= rangeStartUtc)
            .GroupBy(x => x.LibraryId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.PaidAmount));
    }

    public static async Task<InstitutionRevenueMetrics> AggregateSummaryForLibrariesAsync(
        ApplicationDbContext dbContext,
        IReadOnlyCollection<Guid> libraryIds,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return InstitutionRevenueMetrics.Empty;
        }

        return await AggregateSummaryForLibrariesAsync(
            dbContext,
            dbContext.Libraries.AsNoTracking().Where(x => libraryIds.Contains(x.Id)).Select(x => x.Id),
            nowUtc,
            cancellationToken);
    }

    public static async Task<InstitutionRevenueMetrics> AggregateSummaryForLibrariesAsync(
        ApplicationDbContext dbContext,
        IQueryable<Guid> scopedLibraryIds,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        var (monthStart, previousMonthStart, quarterStart, yearStart) = GetPeriodStartsUtc(nowUtc);

        var scopedMemberIds = dbContext.MemberLibraries
            .AsNoTracking()
            .Where(ml => !ml.IsDeleted && ml.IsCurrent && scopedLibraryIds.Contains(ml.LibraryId))
            .Select(ml => ml.MemberId)
            .Distinct();

        var summary = await dbContext.MemberPlans
            .AsNoTracking()
            .Where(mp => !mp.IsDeleted && mp.PaidAmount > 0 && scopedMemberIds.Contains(mp.MemberId))
            .GroupBy(_ => 1)
            .Select(g => new
            {
                AllTime = g.Sum(x => x.PaidAmount),
                Mtd = g.Sum(x => x.CreatedAtUtc >= monthStart ? x.PaidAmount : 0m),
                PreviousMtd = g.Sum(x => x.CreatedAtUtc >= previousMonthStart && x.CreatedAtUtc < monthStart ? x.PaidAmount : 0m),
                Monthly = g.Sum(x => x.CreatedAtUtc >= monthStart ? x.PaidAmount : 0m),
                Quarterly = g.Sum(x => x.CreatedAtUtc >= quarterStart ? x.PaidAmount : 0m),
                Yearly = g.Sum(x => x.CreatedAtUtc >= yearStart ? x.PaidAmount : 0m),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (summary is null)
        {
            return InstitutionRevenueMetrics.Empty;
        }

        return new InstitutionRevenueMetrics
        {
            AllTime = summary.AllTime,
            Mtd = summary.Mtd,
            PreviousMtd = summary.PreviousMtd,
            Monthly = summary.Monthly,
            Quarterly = summary.Quarterly,
            Yearly = summary.Yearly,
        };
    }
}
