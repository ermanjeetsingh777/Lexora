using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public static class LibraryOverviewHelper
{
    private static readonly string[] WeekdayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    public static async Task<IReadOnlyCollection<InstitutionTrendPointResponse>> BuildOccupancyTrendAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        int capacity,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken)
    {
        var start = DateOnly.FromDateTime(startDate);
        var end = DateOnly.FromDateTime(endDate);

        var dailyAttendance = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.LibraryId == libraryId)
            .Where(x => x.AttendanceDate >= start && x.AttendanceDate <= end)
            .GroupBy(x => x.AttendanceDate)
            .Select(g => new
            {
                Date = g.Key,
                MemberCount = g.Select(x => x.MemberId).Distinct().Count(),
            })
            .ToDictionaryAsync(x => x.Date, x => x.MemberCount, cancellationToken);

        var points = new List<InstitutionTrendPointResponse>();
        for (var day = start; day <= end; day = day.AddDays(1))
        {
            dailyAttendance.TryGetValue(day, out var membersPresent);

            points.Add(new InstitutionTrendPointResponse
            {
                Date = day.ToString("MM-dd"),
                Value = membersPresent,
            });
        }

        return points;
    }

    public static async Task<(string? Start, string? End)> BuildPeakHourWindowAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-30);

        var hourCounts = await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.LibraryId == libraryId && x.CreatedAtUtc >= since)
            .Select(x => new
            {
                Hour = x.CheckInTime.HasValue
                    ? x.CheckInTime.Value.Hour
                    : x.CreatedAtUtc.Hour,
            })
            .GroupBy(x => x.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(1)
            .FirstOrDefaultAsync(cancellationToken);

        if (hourCounts is null || hourCounts.Count == 0)
        {
            return (null, null);
        }

        var peakHour = hourCounts.Hour;
        return (
            $"{peakHour:D2}:00",
            $"{Math.Min(peakHour + 1, 23):D2}:00");
    }

    public static async Task<int> BuildCheckedInTodayAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        return await dbContext.MemberAttendances
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                        && x.LibraryId == libraryId
                        && x.AttendanceDate == today
                        && x.Status == AttendanceStatus.Present
                        && x.CheckOutTime == null)
            .Select(x => x.MemberId)
            .Distinct()
            .CountAsync(cancellationToken);
    }

    public static IReadOnlyCollection<LibraryDayHoursResponse> BuildWeeklyHours(
        TimeOnly? branchOpen,
        TimeOnly? branchClose)
    {
        var open = branchOpen?.ToString("HH:mm");
        var close = branchClose?.ToString("HH:mm");
        var closed = string.IsNullOrWhiteSpace(open) || string.IsNullOrWhiteSpace(close);

        return WeekdayKeys
            .Select(day => new LibraryDayHoursResponse
            {
                Day = day,
                Closed = closed,
                Open = closed ? null : open,
                Close = closed ? null : close,
            })
            .ToList();
    }

    public static IReadOnlyCollection<LibraryWeeklyHour> CreateDefaultWeeklyHours(
        Guid libraryId,
        TimeOnly? branchOpen,
        TimeOnly? branchClose,
        string? userId)
    {
        var closed = !branchOpen.HasValue || !branchClose.HasValue;

        return WeekdayKeys
            .Select(day => new LibraryWeeklyHour
            {
                LibraryId = libraryId,
                Day = day,
                Closed = closed,
                OpenTime = closed ? null : branchOpen,
                CloseTime = closed ? null : branchClose,
                CreatedBy = userId,
            })
            .ToList();
    }

    public static async Task<IReadOnlyCollection<LibraryDayHoursResponse>> LoadWeeklyHoursAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        TimeOnly? branchOpen,
        TimeOnly? branchClose,
        CancellationToken cancellationToken)
    {
        var stored = await dbContext.LibraryWeeklyHours
            .AsNoTracking()
            .Where(x => x.LibraryId == libraryId && !x.IsDeleted)
            .ToListAsync(cancellationToken);

        if (stored.Count == 0)
        {
            return BuildWeeklyHours(branchOpen, branchClose);
        }

        var fallbackByDay = BuildWeeklyHours(branchOpen, branchClose)
            .ToDictionary(x => x.Day, StringComparer.OrdinalIgnoreCase);

        return WeekdayKeys
            .Select(day =>
            {
                var row = stored.FirstOrDefault(x => string.Equals(x.Day, day, StringComparison.OrdinalIgnoreCase));
                if (row is null)
                {
                    return fallbackByDay[day];
                }

                return new LibraryDayHoursResponse
                {
                    Day = day,
                    Closed = row.Closed,
                    Open = row.OpenTime?.ToString("HH:mm"),
                    Close = row.CloseTime?.ToString("HH:mm"),
                };
            })
            .ToList();
    }

    public static async Task<IReadOnlyCollection<LibraryHoursExceptionResponse>> LoadHoursExceptionsAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        return await dbContext.LibraryHoursExceptions
            .AsNoTracking()
            .Where(x => x.LibraryId == libraryId && !x.IsDeleted)
            .OrderBy(x => x.StartDate)
            .ThenBy(x => x.Name)
            .Select(x => new LibraryHoursExceptionResponse
            {
                Id = x.Id,
                Name = x.Name,
                StartDate = x.StartDate.ToString("yyyy-MM-dd"),
                EndDate = x.EndDate.ToString("yyyy-MM-dd"),
                Closed = x.Closed,
                Open = x.OpenTime.HasValue ? x.OpenTime.Value.ToString("HH:mm") : null,
                Close = x.CloseTime.HasValue ? x.CloseTime.Value.ToString("HH:mm") : null,
            })
            .ToListAsync(cancellationToken);
    }

    public static TimeOnly? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return TimeOnly.TryParse(value, out var parsed) ? parsed : null;
    }

    public static string? ValidateDayHours(LibraryDayHoursRequest dayHours)
    {
        if (string.IsNullOrWhiteSpace(dayHours.Day) || !WeekdayKeys.Contains(dayHours.Day, StringComparer.OrdinalIgnoreCase))
        {
            return "Invalid day value.";
        }

        if (dayHours.Closed)
        {
            return null;
        }

        var open = ParseTime(dayHours.Open);
        var close = ParseTime(dayHours.Close);
        if (!open.HasValue || !close.HasValue)
        {
            return "Set both opening and closing time, or mark the day as closed.";
        }

        if (close.Value <= open.Value)
        {
            return "Closing time must be after opening time.";
        }

        return null;
    }

    public static DateOnly TodayDateOnly() => DateOnly.FromDateTime(DateTime.UtcNow);

    public static bool IsPastHoursException(DateOnly endDate, DateOnly today)
        => endDate < today;

    public static bool HoursExceptionMatchesRequest(
        LibraryHoursException entity,
        LibraryHoursExceptionRequest request)
    {
        if (!DateOnly.TryParse(request.StartDate, out var startDate)
            || !DateOnly.TryParse(request.EndDate, out var endDate))
        {
            return false;
        }

        var openTime = request.Closed ? null : ParseTime(request.Open);
        var closeTime = request.Closed ? null : ParseTime(request.Close);

        return entity.Name == request.Name.Trim()
               && entity.StartDate == startDate
               && entity.EndDate == endDate
               && entity.Closed == request.Closed
               && entity.OpenTime == openTime
               && entity.CloseTime == closeTime;
    }

    public static string? ValidateHoursException(LibraryHoursExceptionRequest exception)
    {
        if (string.IsNullOrWhiteSpace(exception.Name))
        {
            return "Name is required.";
        }

        if (!DateOnly.TryParse(exception.StartDate, out var startDate)
            || !DateOnly.TryParse(exception.EndDate, out var endDate))
        {
            return "Start and end dates are required.";
        }

        if (endDate < startDate)
        {
            return "End date must be on or after start date.";
        }

        if (exception.Closed)
        {
            return null;
        }

        var open = ParseTime(exception.Open);
        var close = ParseTime(exception.Close);
        if (!open.HasValue || !close.HasValue)
        {
            return "Set both opening and closing time, or mark as closed.";
        }

        if (close.Value <= open.Value)
        {
            return "Closing time must be after opening time.";
        }

        return null;
    }

    public static async Task<LibraryCalendarViewResponse> BuildCalendarViewAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken)
    {
        if (endDate < startDate)
        {
            throw new InvalidOperationException("End date must be on or after start date.");
        }

        var library = await dbContext.Libraries
            .AsNoTracking()
            .Where(x => x.Id == libraryId && !x.IsDeleted)
            .Select(x => new
            {
                x.Id,
                x.Name,
                BranchOpen = x.Branch!.OperatingHoursStart,
                BranchClose = x.Branch.OperatingHoursEnd,
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("Library not found.");

        var weeklyHours = await LoadWeeklyHoursAsync(
            dbContext,
            libraryId,
            library.BranchOpen,
            library.BranchClose,
            cancellationToken);

        var weeklyByDay = weeklyHours.ToDictionary(x => x.Day, StringComparer.OrdinalIgnoreCase);

        var exceptions = await dbContext.LibraryHoursExceptions
            .AsNoTracking()
            .Where(x => x.LibraryId == libraryId
                        && !x.IsDeleted
                        && x.EndDate >= startDate
                        && x.StartDate <= endDate)
            .OrderBy(x => x.StartDate)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var exceptionResponses = exceptions
            .Select(x => new LibraryHoursExceptionResponse
            {
                Id = x.Id,
                Name = x.Name,
                StartDate = x.StartDate.ToString("yyyy-MM-dd"),
                EndDate = x.EndDate.ToString("yyyy-MM-dd"),
                Closed = x.Closed,
                Open = x.OpenTime?.ToString("HH:mm"),
                Close = x.CloseTime?.ToString("HH:mm"),
            })
            .ToList();

        var days = new List<LibraryCalendarDayResponse>();
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            days.Add(ResolveCalendarDay(date, weeklyByDay, exceptions));
        }

        return new LibraryCalendarViewResponse
        {
            LibraryId = library.Id,
            LibraryName = library.Name,
            StartDate = startDate.ToString("yyyy-MM-dd"),
            EndDate = endDate.ToString("yyyy-MM-dd"),
            Days = days,
            Exceptions = exceptionResponses,
        };
    }

    private static LibraryCalendarDayResponse ResolveCalendarDay(
        DateOnly date,
        IReadOnlyDictionary<string, LibraryDayHoursResponse> weeklyByDay,
        IReadOnlyCollection<LibraryHoursException> exceptions)
    {
        var dayKey = ToDayKey(date.DayOfWeek);
        var exception = exceptions
            .Where(x => x.StartDate <= date && x.EndDate >= date)
            .OrderByDescending(x => (x.EndDate.DayNumber - x.StartDate.DayNumber))
            .ThenBy(x => x.StartDate)
            .FirstOrDefault();

        if (exception is not null)
        {
            if (exception.Closed)
            {
                return new LibraryCalendarDayResponse
                {
                    Date = date.ToString("yyyy-MM-dd"),
                    Day = dayKey,
                    Status = "holiday",
                    Closed = true,
                    Label = exception.Name,
                    IsException = true,
                    Source = "exception",
                };
            }

            return new LibraryCalendarDayResponse
            {
                Date = date.ToString("yyyy-MM-dd"),
                Day = dayKey,
                Status = "exception",
                Closed = false,
                Open = exception.OpenTime?.ToString("HH:mm"),
                Close = exception.CloseTime?.ToString("HH:mm"),
                Label = exception.Name,
                IsException = true,
                Source = "exception",
            };
        }

        weeklyByDay.TryGetValue(dayKey, out var weekly);
        weekly ??= new LibraryDayHoursResponse { Day = dayKey, Closed = true };

        if (weekly.Closed || string.IsNullOrWhiteSpace(weekly.Open) || string.IsNullOrWhiteSpace(weekly.Close))
        {
            return new LibraryCalendarDayResponse
            {
                Date = date.ToString("yyyy-MM-dd"),
                Day = dayKey,
                Status = "closed",
                Closed = true,
                IsException = false,
                Source = "weekly",
            };
        }

        return new LibraryCalendarDayResponse
        {
            Date = date.ToString("yyyy-MM-dd"),
            Day = dayKey,
            Status = "open",
            Closed = false,
            Open = weekly.Open,
            Close = weekly.Close,
            IsException = false,
            Source = "weekly",
        };
    }

    private static string ToDayKey(DayOfWeek dayOfWeek) => dayOfWeek switch
    {
        DayOfWeek.Monday => "mon",
        DayOfWeek.Tuesday => "tue",
        DayOfWeek.Wednesday => "wed",
        DayOfWeek.Thursday => "thu",
        DayOfWeek.Friday => "fri",
        DayOfWeek.Saturday => "sat",
        DayOfWeek.Sunday => "sun",
        _ => "mon",
    };

    public static async Task<IReadOnlyCollection<LibraryDetailSeatResponse>> BuildSeatsAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        int floor,
        int capacity,
        CancellationToken cancellationToken)
    {
        var dbSeats = await dbContext.Seats
            .AsNoTracking()
            .Where(x => x.LibraryId == libraryId)
            .OrderBy(x => x.SeatNumber)
            .ToListAsync(cancellationToken);

        var assignments = await (
            from ml in dbContext.MemberLibraries.AsNoTracking()
            join m in dbContext.Members.AsNoTracking() on ml.MemberId equals m.Id
            join s in dbContext.Seats.AsNoTracking() on ml.SeatId equals s.Id into seatJoin
            from seat in seatJoin.DefaultIfEmpty()
            where !ml.IsDeleted && ml.IsCurrent && ml.LibraryId == libraryId
            select new
            {
                ml.SeatId,
                SeatNumber = seat != null ? seat.SeatNumber : null,
                MemberName = m.FullName ?? "Member",
            }
        ).ToListAsync(cancellationToken);

        var occupiedSeatIds = assignments
            .Where(x => x.SeatId.HasValue)
            .Select(x => x.SeatId!.Value)
            .ToHashSet();

        var memberBySeatNumber = assignments
            .Where(x => !string.IsNullOrWhiteSpace(x.SeatNumber))
            .GroupBy(x => x.SeatNumber!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().MemberName, StringComparer.OrdinalIgnoreCase);

        var sessionOccupancy = await AttendanceSeatHelper.GetActiveSessionOccupancyAsync(
            dbContext,
            libraryId,
            cancellationToken);

        var sessionsBySeat = await AttendanceSeatHelper.GetTodaySeatSessionsByNumberAsync(
            dbContext,
            libraryId,
            cancellationToken);

        var sourceSeats = dbSeats.Count > 0
            ? dbSeats.Select(seat => new SeatSource(
                seat.Id,
                seat.SeatNumber,
                seat.IsActive,
                "Standard"))
            .ToList()
            : BuildVirtualSeats(libraryId, capacity);

        const int cols = 10;
        var results = new List<LibraryDetailSeatResponse>();

        for (var index = 0; index < sourceSeats.Count; index++)
        {
            var source = sourceSeats[index];
            var section = ParseSection(source.Number);
            sessionsBySeat.TryGetValue(source.Number, out var todaySessions);
            todaySessions ??= [];

            var activeSession = todaySessions.FirstOrDefault(x => x.IsActive);
            var isOccupied = activeSession != null
                             || occupiedSeatIds.Contains(source.Id)
                             || memberBySeatNumber.ContainsKey(source.Number)
                             || sessionOccupancy.ContainsKey(source.Number);
            var status = !source.IsActive
                ? "maintenance"
                : isOccupied
                    ? "occupied"
                    : "available";

            memberBySeatNumber.TryGetValue(source.Number, out var assignedMemberName);
            var memberName = activeSession?.MemberName ?? assignedMemberName;
            if (string.IsNullOrWhiteSpace(memberName))
            {
                sessionOccupancy.TryGetValue(source.Number, out memberName);
            }

            results.Add(new LibraryDetailSeatResponse
            {
                Id = source.Id,
                Number = source.Number,
                Row = (index / cols) + 1,
                Col = (index % cols) + 1,
                Section = section,
                Floor = floor,
                Status = status,
                Type = source.Type,
                MemberName = memberName,
                TodaySessionCount = todaySessions.Count,
                TodaySessions = todaySessions.Select(session => new LibrarySeatSessionResponse
                {
                    MemberName = session.MemberName,
                    MembershipNo = session.MembershipNo,
                    CheckInTime = session.CheckInTime?.ToString("HH:mm"),
                    CheckOutTime = session.CheckOutTime?.ToString("HH:mm"),
                    IsActive = session.IsActive,
                }).ToList(),
            });
        }

        return results;
    }

    public static IReadOnlyCollection<LibrarySectionSummaryResponse> BuildSectionsFromSeats(
        IReadOnlyCollection<LibraryDetailSeatResponse> seats)
    {
        return seats
            .GroupBy(x => x.Section, StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x.Key)
            .Select(group => new LibrarySectionSummaryResponse
            {
                Name = group.Key,
                Capacity = group.Count(),
                Occupied = group.Count(x => x.Status is "occupied" or "reserved"),
            })
            .ToList();
    }

    public static async Task<IReadOnlyCollection<LibraryActivityItemResponse>> BuildRecentActivityAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from attendance in dbContext.MemberAttendances.AsNoTracking()
            join member in dbContext.Members.AsNoTracking() on attendance.MemberId equals member.Id
            where !attendance.IsDeleted && attendance.LibraryId == libraryId
            orderby attendance.CreatedAtUtc descending
            select new
            {
                attendance.Id,
                MemberName = member.FullName ?? "Member",
                attendance.SeatNo,
                attendance.CheckInTime,
                attendance.CheckOutTime,
                attendance.CreatedAtUtc,
            }
        ).Take(6).ToListAsync(cancellationToken);

        return rows.Select(row =>
        {
            var action = row.CheckOutTime.HasValue ? "checked out" : "checked in";
            var seatLabel = string.IsNullOrWhiteSpace(row.SeatNo) ? "the library" : $"Seat {row.SeatNo}";
            return new LibraryActivityItemResponse
            {
                Id = row.Id.ToString(),
                Detail = $"{row.MemberName} {action} · {seatLabel}",
                OccurredAtUtc = row.CreatedAtUtc,
            };
        }).ToList();
    }

    private static List<SeatSource> BuildVirtualSeats(Guid libraryId, int capacity)
    {
        if (capacity <= 0)
        {
            return [];
        }

        var sections = new[] { "A", "B", "C", "D" };
        var seatCount = Math.Min(capacity, 120);
        var seatsPerSection = Math.Max(1, (int)Math.Ceiling(seatCount / (double)sections.Length));

        var results = new List<SeatSource>();
        for (var index = 0; index < seatCount; index++)
        {
            var section = sections[Math.Min(index / seatsPerSection, sections.Length - 1)];
            var number = $"{section}-{(index + 1).ToString().PadLeft(2, '0')}";
            results.Add(new SeatSource(CreateSeatId(libraryId, number), number, true, InferSeatType(index)));
        }

        return results;
    }

    private static string InferSeatType(int index)
    {
        if (index % 13 == 0) return "Accessibility";
        if (index % 7 == 0) return "Premium";
        return "Standard";
    }

    private static string ParseSection(string seatNumber)
    {
        if (string.IsNullOrWhiteSpace(seatNumber))
        {
            return "General";
        }

        var separatorIndex = seatNumber.IndexOf('-', StringComparison.Ordinal);
        if (separatorIndex <= 0)
        {
            return seatNumber.Trim();
        }

        return seatNumber[..separatorIndex].Trim();
    }

    private static Guid CreateSeatId(Guid libraryId, string seatNumber)
    {
        var bytes = System.Security.Cryptography.MD5.HashData(
            System.Text.Encoding.UTF8.GetBytes($"{libraryId:N}:{seatNumber}"));
        return new Guid(bytes);
    }

    private sealed record SeatSource(Guid Id, string Number, bool IsActive, string Type);
}
