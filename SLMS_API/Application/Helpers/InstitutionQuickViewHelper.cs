using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public static class InstitutionQuickViewHelper
{
    public static string NormalizeMetric(string? metric) =>
        string.Equals(metric, "revenue", StringComparison.OrdinalIgnoreCase) ? "revenue" : "occupancy";

    public static int NormalizeRange(int range) =>
        range switch
        {
            7 => 7,
            30 => 30,
            _ => 14
        };

    public static async Task<IReadOnlyCollection<InstitutionTrendPointResponse>> BuildRevenueTrendAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken)
    {
        var endExclusive = endDate.AddDays(1);

        var dailyTotals = await (
            from mp in dbContext.MemberPlans.AsNoTracking()
            join ml in dbContext.MemberLibraries.AsNoTracking() on mp.MemberId equals ml.MemberId
            where !mp.IsDeleted
                  && !ml.IsDeleted
                  && ml.InstitutionId == institutionId
                  && mp.CreatedAtUtc >= startDate
                  && mp.CreatedAtUtc < endExclusive
            group mp by mp.CreatedAtUtc.Date into g
            select new { Date = g.Key, Total = g.Sum(x => x.PaidAmount) }
        ).ToDictionaryAsync(x => x.Date, x => x.Total, cancellationToken);

        return BuildDailyPoints(startDate, endDate, dailyTotals);
    }

    public static async Task<IReadOnlyCollection<InstitutionTrendPointResponse>> BuildOccupancyTrendAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken)
    {
        var totalCapacity = await dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == institutionId && !x.IsDeleted)
            .SumAsync(x => x.Capacity ?? 0, cancellationToken);

        var start = DateOnly.FromDateTime(startDate);
        var end = DateOnly.FromDateTime(endDate);

        var dailyAttendance = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.InstitutionId == institutionId)
            .Where(x => x.AttendanceDate >= start && x.AttendanceDate <= end)
            .GroupBy(x => x.AttendanceDate)
            .Select(g => new
            {
                Date = g.Key,
                MemberCount = g.Select(x => x.MemberId).Distinct().Count()
            })
            .ToDictionaryAsync(x => x.Date, x => x.MemberCount, cancellationToken);

        var points = new List<InstitutionTrendPointResponse>();
        for (var day = start; day <= end; day = day.AddDays(1))
        {
            dailyAttendance.TryGetValue(day, out var membersPresent);
            var value = totalCapacity > 0
                ? Math.Round((decimal)membersPresent / totalCapacity * 100m, 1)
                : 0m;

            points.Add(new InstitutionTrendPointResponse
            {
                Date = day.ToString("MMM d"),
                Value = value
            });
        }

        return points;
    }

    public static async Task<IReadOnlyCollection<InstitutionQuickViewActivityItemResponse>> BuildActivityAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-14);
        var items = new List<InstitutionQuickViewActivityItemResponse>();

        var payments = await (
            from mp in dbContext.MemberPlans.AsNoTracking()
            join ml in dbContext.MemberLibraries.AsNoTracking() on mp.MemberId equals ml.MemberId
            where !mp.IsDeleted
                  && !ml.IsDeleted
                  && ml.InstitutionId == institutionId
                  && mp.PaidAmount > 0
                  && mp.CreatedAtUtc >= since
            orderby mp.CreatedAtUtc descending
            select new { mp.CreatedAtUtc, mp.PaidAmount }
        ).Take(5).ToListAsync(cancellationToken);

        items.AddRange(payments.Select(p => new InstitutionQuickViewActivityItemResponse
        {
            OccurredAtUtc = p.CreatedAtUtc,
            Text = $"Payment received · ₹{FormatAmount(p.PaidAmount)}",
            Severity = "info"
        }));

        var checkInGroups = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.InstitutionId == institutionId && x.CreatedAtUtc >= since)
            .GroupBy(x => x.AttendanceDate)
            .Select(g => new
            {
                LatestAtUtc = g.Max(x => x.CreatedAtUtc),
                Count = g.Count()
            })
            .OrderByDescending(x => x.LatestAtUtc)
            .Take(5)
            .ToListAsync(cancellationToken);

        items.AddRange(checkInGroups.Select(g => new InstitutionQuickViewActivityItemResponse
        {
            OccurredAtUtc = g.LatestAtUtc,
            Text = $"{g.Count} check-in{(g.Count == 1 ? "" : "s")} recorded",
            Severity = "info"
        }));

        var enrollments = await dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.InstitutionId == institutionId && x.JoinedOn >= since)
            .OrderByDescending(x => x.JoinedOn)
            .Take(5)
            .Select(x => new { x.JoinedOn })
            .ToListAsync(cancellationToken);

        items.AddRange(enrollments.Select(e => new InstitutionQuickViewActivityItemResponse
        {
            OccurredAtUtc = e.JoinedOn,
            Text = "New member enrolled",
            Severity = "info"
        }));

        var totalCapacity = await dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == institutionId && !x.IsDeleted)
            .SumAsync(x => x.Capacity ?? 0, cancellationToken);

        var memberCount = await dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && x.InstitutionId == institutionId)
            .Select(x => x.MemberId)
            .Distinct()
            .CountAsync(cancellationToken);

        var occupancy = totalCapacity > 0
            ? Math.Round((decimal)memberCount / totalCapacity * 100m, 1)
            : 0m;

        if (occupancy >= 85)
        {
            items.Add(new InstitutionQuickViewActivityItemResponse
            {
                OccurredAtUtc = DateTime.UtcNow,
                Text = "Capacity nearing limit",
                Severity = "warn"
            });
        }
        else if (occupancy > 0 && occupancy < 35)
        {
            items.Add(new InstitutionQuickViewActivityItemResponse
            {
                OccurredAtUtc = DateTime.UtcNow,
                Text = "Low utilization alert",
                Severity = "warn"
            });
        }

        return items
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(20)
            .ToList();
    }

    private static List<InstitutionTrendPointResponse> BuildDailyPoints(
        DateTime startDate,
        DateTime endDate,
        Dictionary<DateTime, decimal> dailyTotals)
    {
        var points = new List<InstitutionTrendPointResponse>();
        for (var day = startDate; day <= endDate; day = day.AddDays(1))
        {
            dailyTotals.TryGetValue(day, out var total);
            points.Add(new InstitutionTrendPointResponse
            {
                Date = day.ToString("MMM d"),
                Value = total
            });
        }

        return points;
    }

    private static string FormatAmount(decimal amount)
    {
        if (amount >= 100_000) return $"{amount / 100_000m:0.#}L";
        if (amount >= 1_000) return $"{amount / 1_000m:0.#}k";
        return amount.ToString("0");
    }
}
