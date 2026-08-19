using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public static class BranchOverviewHelper
{
    private static readonly string[] WeekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    public static async Task<IReadOnlyCollection<InstitutionTrendPointResponse>> BuildOccupancyTrendAsync(
        ApplicationDbContext dbContext,
        Guid branchId,
        int capacity,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken)
    {
        var start = DateOnly.FromDateTime(startDate);
        var end = DateOnly.FromDateTime(endDate);

        var dailyAttendance = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.BranchId == branchId)
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
            var value = capacity > 0
                ? Math.Round((decimal)membersPresent / capacity * 100m, 1)
                : 0m;

            points.Add(new InstitutionTrendPointResponse
            {
                Date = day.ToString("MM-dd"),
                Value = value
            });
        }

        return points;
    }

    public static async Task<IReadOnlyCollection<InstitutionAttendanceDayResponse>> BuildAttendanceTrendAsync(
        ApplicationDbContext dbContext,
        Guid branchId,
        int days,
        CancellationToken cancellationToken)
    {
        var endDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDate = endDate.AddDays(-(days - 1));

        var enrolledCount = await dbContext.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && x.BranchId == branchId)
            .Select(x => x.MemberId)
            .Distinct()
            .CountAsync(cancellationToken);

        var dailyStats = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                        && x.BranchId == branchId
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
        Guid branchId,
        int capacity,
        CancellationToken cancellationToken)
    {
        var hours = Enumerable.Range(8, 12).ToList();
        var since = DateTime.UtcNow.AddDays(-28);

        var attendanceRows = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.BranchId == branchId && x.CreatedAtUtc >= since)
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

                var value = capacity > 0
                    ? (int)Math.Round((decimal)membersInCell / capacity * 100m)
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

    public static async Task<IReadOnlyCollection<BranchPeakHourResponse>> BuildPeakHoursAsync(
        ApplicationDbContext dbContext,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var rows = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.BranchId == branchId && x.AttendanceDate == today)
            .Select(x => new
            {
                Hour = x.CheckInTime.HasValue
                    ? x.CheckInTime.Value.Hour
                    : x.CreatedAtUtc.Hour
            })
            .ToListAsync(cancellationToken);

        return Enumerable.Range(8, 14)
            .Select(hour =>
            {
                var count = rows.Count(x => x.Hour == hour);
                return new BranchPeakHourResponse
                {
                    Hour = $"{hour:00}:00",
                    CheckIns = count
                };
            })
            .ToList();
    }

    public static async Task<IReadOnlyCollection<BranchFootfallDayResponse>> BuildFootfallByShiftAsync(
        ApplicationDbContext dbContext,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-28));

        var rows = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.BranchId == branchId && x.AttendanceDate >= since)
            .Select(x => new
            {
                x.AttendanceDate,
                Hour = x.CheckInTime.HasValue
                    ? x.CheckInTime.Value.Hour
                    : x.CreatedAtUtc.Hour
            })
            .ToListAsync(cancellationToken);

        return WeekdayLabels.Select(dayLabel =>
        {
            var dayIndex = Array.IndexOf(WeekdayLabels, dayLabel);
            var dotnetDay = dayIndex == 6 ? DayOfWeek.Sunday : (DayOfWeek)(dayIndex + 1);
            var dayRows = rows.Where(x => x.AttendanceDate.DayOfWeek == dotnetDay).ToList();

            return new BranchFootfallDayResponse
            {
                Day = dayLabel,
                Morning = dayRows.Count(x => x.Hour >= 6 && x.Hour < 12),
                Afternoon = dayRows.Count(x => x.Hour >= 12 && x.Hour < 17),
                Evening = dayRows.Count(x => x.Hour >= 17 && x.Hour < 21),
                Night = dayRows.Count(x => x.Hour >= 21 || x.Hour < 6)
            };
        }).ToList();
    }

    public static async Task<int> BuildAvgFootfallPerDayAsync(
        ApplicationDbContext dbContext,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));

        var dailyCounts = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.BranchId == branchId && x.AttendanceDate >= since)
            .GroupBy(x => x.AttendanceDate)
            .Select(g => g.Select(x => x.MemberId).Distinct().Count())
            .ToListAsync(cancellationToken);

        return dailyCounts.Count == 0
            ? 0
            : (int)Math.Round(dailyCounts.Average());
    }

    public static async Task<IReadOnlyCollection<BranchActivityItemResponse>> BuildActivityAsync(
        ApplicationDbContext dbContext,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-30);
        var items = new List<BranchActivityItemResponse>();

        var payments = await (
            from mp in dbContext.MemberPlans.AsNoTracking()
            join ml in dbContext.MemberLibraries.AsNoTracking() on mp.MemberId equals ml.MemberId
            join m in dbContext.Members.AsNoTracking() on mp.MemberId equals m.Id
            where !mp.IsDeleted
                  && !ml.IsDeleted
                  && ml.BranchId == branchId
                  && mp.PaidAmount > 0
                  && mp.CreatedAtUtc >= since
            orderby mp.CreatedAtUtc descending
            select new { mp.Id, mp.CreatedAtUtc, mp.PaidAmount, MemberName = m.FullName ?? "Member" }
        ).Take(30).ToListAsync(cancellationToken);

        items.AddRange(payments.Select(p => new BranchActivityItemResponse
        {
            Id = $"payment-{p.Id}",
            Type = "payment",
            Actor = p.MemberName,
            Detail = $"₹{FormatAmount(p.PaidAmount)} plan payment",
            OccurredAtUtc = p.CreatedAtUtc
        }));

        var checkIns = await (
            from ma in dbContext.MemberAttendances.AsNoTracking()
            join m in dbContext.Members.AsNoTracking() on ma.MemberId equals m.Id
            where !ma.IsDeleted
                  && ma.BranchId == branchId
                  && ma.CreatedAtUtc >= since
            orderby ma.CreatedAtUtc descending
            select new
            {
                ma.Id,
                ma.CreatedAtUtc,
                MemberName = m.FullName ?? "Member",
                ma.SeatNo
            }
        ).Take(60).ToListAsync(cancellationToken);

        items.AddRange(checkIns.Select(c => new BranchActivityItemResponse
        {
            Id = $"checkin-{c.Id}",
            Type = "check-in",
            Actor = c.MemberName,
            Detail = string.IsNullOrWhiteSpace(c.SeatNo) ? "Checked in" : $"Seat {c.SeatNo}",
            OccurredAtUtc = c.CreatedAtUtc
        }));

        var enrollments = await (
            from ml in dbContext.MemberLibraries.AsNoTracking()
            join m in dbContext.Members.AsNoTracking() on ml.MemberId equals m.Id
            where !ml.IsDeleted && ml.BranchId == branchId && ml.JoinedOn >= since
            orderby ml.JoinedOn descending
            select new { ml.Id, ml.JoinedOn, MemberName = m.FullName ?? "Member" }
        ).Take(20).ToListAsync(cancellationToken);

        items.AddRange(enrollments.Select(e => new BranchActivityItemResponse
        {
            Id = $"enrollment-{e.Id}",
            Type = "enrollment",
            Actor = e.MemberName,
            Detail = "New member enrolled",
            OccurredAtUtc = e.JoinedOn
        }));

        return items
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(80)
            .ToList();
    }

    private static string FormatAmount(decimal amount) =>
        amount >= 1000 ? $"{amount / 1000m:0.#}k" : amount.ToString("0");
}
