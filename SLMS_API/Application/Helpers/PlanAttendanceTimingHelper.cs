using Microsoft.EntityFrameworkCore;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public static class PlanAttendanceTimingHelper
{
    public static readonly TimeOnly FallbackStart = new(9, 0);
    public static readonly TimeOnly FallbackEnd = new(18, 0);

    public static async Task<(TimeOnly Start, TimeOnly End)> ResolveLibraryDefaultHoursAsync(
        ApplicationDbContext db,
        Guid libraryId,
        Guid branchId,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dayKey = today.DayOfWeek switch
        {
            DayOfWeek.Monday => "mon",
            DayOfWeek.Tuesday => "tue",
            DayOfWeek.Wednesday => "wed",
            DayOfWeek.Thursday => "thu",
            DayOfWeek.Friday => "fri",
            DayOfWeek.Saturday => "sat",
            _ => "sun",
        };

        var todayHours = await db.LibraryWeeklyHours.AsNoTracking()
            .Where(h => h.LibraryId == libraryId && h.Day == dayKey && !h.Closed)
            .Select(h => new { h.OpenTime, h.CloseTime })
            .FirstOrDefaultAsync(cancellationToken);

        if (todayHours?.OpenTime is { } open && todayHours.CloseTime is { } close && close > open)
        {
            return (open, close);
        }

        var anyOpen = await db.LibraryWeeklyHours.AsNoTracking()
            .Where(h => h.LibraryId == libraryId && !h.Closed && h.OpenTime != null && h.CloseTime != null)
            .OrderBy(h => h.Day)
            .Select(h => new { h.OpenTime, h.CloseTime })
            .FirstOrDefaultAsync(cancellationToken);

        if (anyOpen?.OpenTime is { } anyOpenTime && anyOpen.CloseTime is { } anyClose && anyClose > anyOpenTime)
        {
            return (anyOpenTime, anyClose);
        }

        var branch = await db.Branches.AsNoTracking()
            .Where(b => b.Id == branchId)
            .Select(b => new { b.OperatingHoursStart, b.OperatingHoursEnd })
            .FirstOrDefaultAsync(cancellationToken);

        if (branch?.OperatingHoursStart is { } branchStart
            && branch.OperatingHoursEnd is { } branchEnd
            && branchEnd > branchStart)
        {
            return (branchStart, branchEnd);
        }

        return (FallbackStart, FallbackEnd);
    }

    public static async Task<(TimeOnly Start, TimeOnly End)?> ResolveMemberPlanHoursAsync(
        ApplicationDbContext db,
        Guid memberId,
        Guid libraryId,
        Guid branchId,
        CancellationToken cancellationToken = default)
    {
        var planTimes = await db.MemberPlans.AsNoTracking()
            .Where(mp => mp.MemberId == memberId && mp.IsCurrent && !mp.IsDeleted)
            .Select(mp => new { mp.Plan.StartTime, mp.Plan.EndTime, mp.Plan.LibraryId })
            .FirstOrDefaultAsync(cancellationToken);

        if (planTimes is not null)
        {
            if (planTimes.StartTime is { } start && planTimes.EndTime is { } end && end > start)
            {
                return (start, end);
            }
        }

        return await ResolveLibraryDefaultHoursAsync(db, libraryId, branchId, cancellationToken);
    }

    public static int ComputeLateMinutes(TimeOnly checkIn, TimeOnly planStart, int graceMinutes = 0)
    {
        var threshold = planStart.AddMinutes(Math.Max(0, graceMinutes));
        if (checkIn <= threshold) return 0;
        return (int)(checkIn.ToTimeSpan() - threshold.ToTimeSpan()).TotalMinutes;
    }

    public static int ComputeOvertimeMinutes(TimeOnly checkOut, TimeOnly planEnd)
    {
        if (checkOut <= planEnd) return 0;
        return (int)(checkOut.ToTimeSpan() - planEnd.ToTimeSpan()).TotalMinutes;
    }

    public static void ValidatePlanWindow(TimeOnly? start, TimeOnly? end)
    {
        if (!start.HasValue || !end.HasValue)
        {
            throw new InvalidOperationException("Plan start time and end time are required.");
        }

        if (end.Value <= start.Value)
        {
            throw new InvalidOperationException("Plan end time must be after start time.");
        }
    }
}
