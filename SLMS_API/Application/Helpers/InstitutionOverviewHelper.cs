using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public static class InstitutionOverviewHelper
{
    private static readonly string[] WeekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    public static async Task<IReadOnlyCollection<InstitutionRevenueDayResponse>> BuildRevenueTrendAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken)
    {
        var endExclusive = endDate.AddDays(1);

        var paymentRows = await (
            from mp in dbContext.MemberPlans.AsNoTracking()
            join ml in dbContext.MemberLibraries.AsNoTracking() on mp.MemberId equals ml.MemberId
            where !mp.IsDeleted
                  && !ml.IsDeleted
                  && ml.InstitutionId == institutionId
                  && mp.PaidAmount > 0
                  && mp.CreatedAtUtc >= startDate
                  && mp.CreatedAtUtc < endExclusive
            select new
            {
                mp.MemberId,
                mp.PaidAmount,
                mp.CreatedAtUtc,
                IsRenewal = dbContext.MemberPlans.Any(prev =>
                    prev.MemberId == mp.MemberId
                    && !prev.IsDeleted
                    && prev.Id != mp.Id
                    && prev.CreatedAtUtc < mp.CreatedAtUtc)
            }
        ).ToListAsync(cancellationToken);

        var revenueByDate = paymentRows
            .GroupBy(x => x.CreatedAtUtc.Date)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.PaidAmount));

        var renewalsByDate = paymentRows
            .Where(x => x.IsRenewal)
            .GroupBy(x => x.CreatedAtUtc.Date)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.PaidAmount));

        var points = new List<InstitutionRevenueDayResponse>();
        for (var day = startDate; day <= endDate; day = day.AddDays(1))
        {
            revenueByDate.TryGetValue(day, out var revenue);
            renewalsByDate.TryGetValue(day, out var renewals);

            points.Add(new InstitutionRevenueDayResponse
            {
                Date = day.ToString("MM-dd"),
                Revenue = revenue,
                Renewals = renewals
            });
        }

        return points;
    }

    public static async Task<IReadOnlyCollection<InstitutionAttendanceDayResponse>> BuildAttendanceTrendAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        int days,
        CancellationToken cancellationToken)
    {
        var endDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDate = endDate.AddDays(-(days - 1));

        var enrolledCount = await dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && x.InstitutionId == institutionId)
            .Select(x => x.MemberId)
            .Distinct()
            .CountAsync(cancellationToken);

        var dailyStats = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                        && x.InstitutionId == institutionId
                        && x.AttendanceDate >= startDate
                        && x.AttendanceDate <= endDate)
            .GroupBy(x => x.AttendanceDate)
            .Select(g => new
            {
                Date = g.Key,
                Present = g.Count(x =>
                    x.Status == AttendanceStatus.Present
                    || x.Status == AttendanceStatus.CheckedIn
                    || x.Status == AttendanceStatus.CheckedOut
                    || x.Status == AttendanceStatus.AutoCheckedOut),
                Late = g.Count(x => x.Status == AttendanceStatus.Late),
                Absent = g.Count(x => x.Status == AttendanceStatus.Absent)
            })
            .ToDictionaryAsync(x => x.Date, cancellationToken);

        var points = new List<InstitutionAttendanceDayResponse>();
        for (var day = startDate; day <= endDate; day = day.AddDays(1))
        {
            if (dailyStats.TryGetValue(day, out var stats))
            {
                var absent = stats.Absent > 0
                    ? stats.Absent
                    : Math.Max(0, enrolledCount - stats.Present - stats.Late);

                points.Add(new InstitutionAttendanceDayResponse
                {
                    Date = day.ToString("MM-dd"),
                    Present = stats.Present,
                    Late = stats.Late,
                    Absent = absent
                });
            }
            else
            {
                points.Add(new InstitutionAttendanceDayResponse
                {
                    Date = day.ToString("MM-dd"),
                    Present = 0,
                    Late = 0,
                    Absent = enrolledCount
                });
            }
        }

        return points;
    }

    public static async Task<InstitutionOccupancyHeatmapResponse> BuildOccupancyHeatmapAsync(
        ApplicationDbContext dbContext,
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        var hours = Enumerable.Range(8, 12).ToList();
        var since = DateTime.UtcNow.AddDays(-28);

        var totalCapacity = await dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == institutionId && !x.IsDeleted)
            .SumAsync(x => x.Capacity ?? 0, cancellationToken);

        var attendanceRows = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                        && x.InstitutionId == institutionId
                        && x.CreatedAtUtc >= since)
            .Select(x => new
            {
                x.AttendanceDate,
                Hour = x.CheckInTime.HasValue
                    ? x.CheckInTime.Value.Hour
                    : x.CreatedAtUtc.Hour,
                x.MemberId
            })
            .ToListAsync(cancellationToken);

        var cells = new List<InstitutionHeatmapCellResponse>();
        foreach (var dayLabel in WeekdayLabels)
        {
            foreach (var hour in hours)
            {
                var dayIndex = Array.IndexOf(WeekdayLabels, dayLabel);
                var dotnetDay = dayIndex == 6 ? DayOfWeek.Sunday : (DayOfWeek)(dayIndex + 1);

                var membersInCell = attendanceRows
                    .Where(x => x.AttendanceDate.DayOfWeek == dotnetDay && x.Hour == hour)
                    .Select(x => x.MemberId)
                    .Distinct()
                    .Count();

                var value = totalCapacity > 0
                    ? (int)Math.Round((decimal)membersInCell / totalCapacity * 100m)
                    : membersInCell > 0
                        ? Math.Min(100, membersInCell * 10)
                        : 0;

                cells.Add(new InstitutionHeatmapCellResponse
                {
                    Day = dayLabel,
                    Hour = hour,
                    Value = Math.Min(100, value)
                });
            }
        }

        return new InstitutionOccupancyHeatmapResponse
        {
            Days = WeekdayLabels,
            Hours = hours,
            Cells = cells
        };
    }
}
