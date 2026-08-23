using SLMS_API.Application.Contracts.Dashboard;

namespace SLMS_API.Application.Helpers;

public enum DashboardPeriodKind
{
    Weekly,
    Monthly,
    Quarterly,
    Yearly,
    All,
}

public static class DashboardPeriodHelper
{
    public static DashboardPeriodKind Parse(string? period)
    {
        return period?.Trim().ToLowerInvariant() switch
        {
            "monthly" => DashboardPeriodKind.Monthly,
            "quarterly" => DashboardPeriodKind.Quarterly,
            "yearly" => DashboardPeriodKind.Yearly,
            "all" => DashboardPeriodKind.All,
            _ => DashboardPeriodKind.Weekly,
        };
    }

    public static string ToApiValue(DashboardPeriodKind period) => period switch
    {
        DashboardPeriodKind.Monthly => "monthly",
        DashboardPeriodKind.Quarterly => "quarterly",
        DashboardPeriodKind.Yearly => "yearly",
        DashboardPeriodKind.All => "all",
        _ => "weekly",
    };

    public static string GetLabel(DashboardPeriodKind period) => period switch
    {
        DashboardPeriodKind.Monthly => "This month",
        DashboardPeriodKind.Quarterly => "This quarter",
        DashboardPeriodKind.Yearly => "This year",
        DashboardPeriodKind.All => "All time",
        _ => "This week",
    };

    public static (DateOnly DateFrom, DateOnly DateTo) ResolveRange(DashboardPeriodKind period, DateOnly today)
    {
        return period switch
        {
            DashboardPeriodKind.Monthly => (today.AddDays(-29), today),
            DashboardPeriodKind.Quarterly => (StartOfQuarter(today), today),
            DashboardPeriodKind.Yearly => (new DateOnly(today.Year, 1, 1), today),
            DashboardPeriodKind.All => (today.AddYears(-5), today),
            _ => (today.AddDays(-6), today),
        };
    }

    public static DashboardRevenueBreakdownResponse ComputeBreakdown(
        IEnumerable<(DateTime CreatedAtUtc, decimal PaidAmount)> rows,
        DateTime nowUtc)
    {
        var today = DateOnly.FromDateTime(nowUtc);
        var weekStart = today.AddDays(-6);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var quarterStart = StartOfQuarter(today);
        var yearStart = new DateOnly(today.Year, 1, 1);

        decimal SumFrom(DateOnly from)
        {
            var startUtc = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            return rows.Where(x => x.CreatedAtUtc >= startUtc).Sum(x => x.PaidAmount);
        }

        return new DashboardRevenueBreakdownResponse
        {
            Weekly = SumFrom(weekStart),
            Monthly = SumFrom(monthStart),
            Quarterly = SumFrom(quarterStart),
            Yearly = SumFrom(yearStart),
            AllTime = rows.Sum(x => x.PaidAmount),
        };
    }

    public static List<DashboardTrendPointResponse> BuildRevenueTrend(
        DashboardPeriodKind period,
        DateOnly today,
        IEnumerable<(DateTime CreatedAtUtc, decimal PaidAmount, bool IsRenewal)> rows)
    {
        var rowList = rows.ToList();

        return period switch
        {
            DashboardPeriodKind.Monthly => BuildDailyTrend(today.AddDays(-29), today, rowList),
            DashboardPeriodKind.Quarterly => BuildMonthlyTrend(StartOfQuarter(today), today, rowList),
            DashboardPeriodKind.Yearly => BuildMonthlyTrend(new DateOnly(today.Year, 1, 1), today, rowList),
            DashboardPeriodKind.All => BuildAllTimeTrend(rowList, today),
            _ => BuildDailyTrend(today.AddDays(-6), today, rowList),
        };
    }

    private static List<DashboardTrendPointResponse> BuildDailyTrend(
        DateOnly dateFrom,
        DateOnly dateTo,
        IReadOnlyCollection<(DateTime CreatedAtUtc, decimal PaidAmount, bool IsRenewal)> rows)
    {
        var trend = new List<DashboardTrendPointResponse>();
        for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
        {
            var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var dayEnd = date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var dayRows = rows.Where(x => x.CreatedAtUtc >= dayStart && x.CreatedAtUtc < dayEnd).ToList();
            trend.Add(new DashboardTrendPointResponse
            {
                Date = date.ToString("yyyy-MM-dd"),
                Revenue = dayRows.Sum(x => x.PaidAmount),
                Renewals = dayRows.Where(x => x.IsRenewal).Sum(x => x.PaidAmount),
            });
        }

        return trend;
    }

    private static List<DashboardTrendPointResponse> BuildMonthlyTrend(
        DateOnly dateFrom,
        DateOnly dateTo,
        IReadOnlyCollection<(DateTime CreatedAtUtc, decimal PaidAmount, bool IsRenewal)> rows)
    {
        var trend = new List<DashboardTrendPointResponse>();
        var cursor = new DateOnly(dateFrom.Year, dateFrom.Month, 1);

        while (cursor <= dateTo)
        {
            var monthEnd = cursor.AddMonths(1);
            var startUtc = cursor.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endUtc = monthEnd.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var monthRows = rows.Where(x => x.CreatedAtUtc >= startUtc && x.CreatedAtUtc < endUtc).ToList();
            trend.Add(new DashboardTrendPointResponse
            {
                Date = cursor.ToString("yyyy-MM"),
                Revenue = monthRows.Sum(x => x.PaidAmount),
                Renewals = monthRows.Where(x => x.IsRenewal).Sum(x => x.PaidAmount),
            });
            cursor = monthEnd;
        }

        return trend;
    }

    private static List<DashboardTrendPointResponse> BuildAllTimeTrend(
        IReadOnlyCollection<(DateTime CreatedAtUtc, decimal PaidAmount, bool IsRenewal)> rows,
        DateOnly today)
    {
        if (rows.Count == 0)
        {
            return [];
        }

        var first = DateOnly.FromDateTime(rows.Min(x => x.CreatedAtUtc));
        var from = new DateOnly(first.Year, first.Month, 1);
        var trend = BuildMonthlyTrend(from, today, rows);

        if (trend.Count > 36)
        {
            trend = trend.TakeLast(36).ToList();
        }

        return trend;
    }

    private static DateOnly StartOfQuarter(DateOnly date)
    {
        var quarterMonth = ((date.Month - 1) / 3) * 3 + 1;
        return new DateOnly(date.Year, quarterMonth, 1);
    }

    public static DashboardRevenueChartsResponse BuildRevenueCharts(
        DateOnly today,
        IEnumerable<(DateTime CreatedAtUtc, decimal PaidAmount, bool IsRenewal)> rows)
    {
        var rowList = rows.ToList();
        var monthlyFrom = new DateOnly(today.Year, today.Month, 1).AddMonths(-11);

        return new DashboardRevenueChartsResponse
        {
            MonthlyTrend = BuildMonthlyTrend(monthlyFrom, today, rowList),
            QuarterlyTrend = BuildQuarterlyTrend(today, rowList, 4),
            YearlyTrend = BuildYearlyTrend(today, rowList, 5),
        };
    }

    private static List<DashboardTrendPointResponse> BuildQuarterlyTrend(
        DateOnly today,
        IReadOnlyCollection<(DateTime CreatedAtUtc, decimal PaidAmount, bool IsRenewal)> rows,
        int quarterCount)
    {
        var trend = new List<DashboardTrendPointResponse>();
        var currentQuarterStart = StartOfQuarter(today);

        for (var i = quarterCount - 1; i >= 0; i--)
        {
            var start = currentQuarterStart.AddMonths(-3 * i);
            var end = start.AddMonths(3);
            var endCap = end > today.AddDays(1) ? today.AddDays(1) : end;

            var startUtc = start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endUtc = endCap.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var quarterRows = rows.Where(x => x.CreatedAtUtc >= startUtc && x.CreatedAtUtc < endUtc).ToList();
            var quarterNumber = ((start.Month - 1) / 3) + 1;

            trend.Add(new DashboardTrendPointResponse
            {
                Date = $"{start.Year}-Q{quarterNumber}",
                Revenue = quarterRows.Sum(x => x.PaidAmount),
                Renewals = quarterRows.Where(x => x.IsRenewal).Sum(x => x.PaidAmount),
            });
        }

        return trend;
    }

    private static List<DashboardTrendPointResponse> BuildYearlyTrend(
        DateOnly today,
        IReadOnlyCollection<(DateTime CreatedAtUtc, decimal PaidAmount, bool IsRenewal)> rows,
        int yearCount)
    {
        var trend = new List<DashboardTrendPointResponse>();
        var firstYear = today.Year - (yearCount - 1);

        for (var year = firstYear; year <= today.Year; year++)
        {
            var start = new DateOnly(year, 1, 1);
            var end = year == today.Year
                ? today.AddDays(1)
                : new DateOnly(year + 1, 1, 1);

            var startUtc = start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endUtc = end.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var yearRows = rows.Where(x => x.CreatedAtUtc >= startUtc && x.CreatedAtUtc < endUtc).ToList();

            trend.Add(new DashboardTrendPointResponse
            {
                Date = year.ToString(),
                Revenue = yearRows.Sum(x => x.PaidAmount),
                Renewals = yearRows.Where(x => x.IsRenewal).Sum(x => x.PaidAmount),
            });
        }

        return trend;
    }
}
