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
}
