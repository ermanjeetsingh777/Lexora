using AutoMapper;
using AutoMapper.Execution;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Application.Helpers;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class AttendanceService : IAttendanceService
{

    private readonly ApplicationDbContext _context;
    private readonly ILibraryService _libraryService;
    private readonly ILogger<AttendanceService> _logger;

    public AttendanceService(
        ApplicationDbContext context,
        ILibraryService libraryService,
        ILogger<AttendanceService> logger)
    {
        _context = context;
        _libraryService = libraryService;
        _logger = logger;
    }

    public async Task<AttendanceResponse> CheckInAsync(Guid memberId, CheckInRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate member
            var member = await _context.Members
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == memberId && x.IsActive,
                    cancellationToken);

            if (member is null)
            {
                throw new InvalidOperationException("Member not found.");
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Check existing attendance
            var attendance = await _context.MemberAttendances
                .FirstOrDefaultAsync(x => x.MemberId == memberId && x.AttendanceDate == today && x.IsActive, cancellationToken);

            if (attendance is not null)
            {
                if (attendance.CheckInTime.HasValue)
                {
                    throw new InvalidOperationException("Member has already checked in today.");
                }

                //attendance.CheckInTime = TimeOnly.FromDateTime(DateTime.UtcNow);
                //attendance.Status = AttendanceStatus.CheckedIn;
                //attendance.Source = AttendanceSource.Manual;
                //attendance.SeatNo = request.SeatNumber;
                //attendance.DeviceId = request.DeviceId;
                //attendance.Remarks = request.Remarks;
                //attendance.UpdatedAtUtc = DateTime.UtcNow;
                //attendance.UpdatedBy = userId;
                //attendance.CreatedAtUtc = DateTime.UtcNow;
                //attendance.CreatedBy = userId;

                //await _context.SaveChangesAsync(cancellationToken);

                //return _mapper.Map<AttendanceResponse>(attendance);
            }

            var memberLibrary = await _context.MemberLibraries
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MemberId == memberId && x.IsActive, cancellationToken);

            if (memberLibrary is null)
            {
                throw new InvalidOperationException("The member is not assigned to any active library.");
            }

            var seatNumber = await AttendanceSeatHelper.ValidateSeatForCheckInAsync(
                _context,
                memberLibrary.LibraryId,
                memberId,
                request.SeatNumber,
                cancellationToken);

            attendance = new MemberAttendance
            {
                Id = Guid.NewGuid(),
                MemberId = member.Id,
                InstitutionId = memberLibrary.InstitutionId,
                BranchId = memberLibrary.BranchId,
                LibraryId = memberLibrary.LibraryId,
                AttendanceDate = today,
                CheckInTime = TimeOnly.FromDateTime(DateTime.UtcNow),
                Status = AttendanceStatus.CheckedIn,
                Source = request.Source ?? AttendanceSource.MobileApp,
                SeatNo = seatNumber,
                DeviceId = request.DeviceId,
                Remarks = request.Remarks,
                DurationMinutes = 0,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                CreatedBy = userId

            };

            _context.MemberAttendances.Add(attendance);
            await AttendanceSeatHelper.AssignSessionSeatAsync(
                _context,
                memberId,
                memberLibrary.LibraryId,
                seatNumber,
                cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);

            return new AttendanceResponse
            {
                Id = attendance.Id,
                MemberId = attendance.MemberId,
                AttendanceDate = attendance.AttendanceDate,
                CheckInTime = attendance.CheckInTime,
                DurationMinutes = 0,
                Status = attendance.Status,
                SeatNo = attendance.SeatNo,
                IsActive = true,
                CheckInAtUtc = attendance.CheckInTime.HasValue
                    ? attendance.AttendanceDate.ToDateTime(attendance.CheckInTime.Value, DateTimeKind.Utc)
                    : null,
            };
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while checking in member {MemberId}", memberId);

            throw new ApplicationException("Unable to check in member. Please try again later.");
        }
    }

    public async Task<AttendanceResponse> CheckOutAsync(Guid memberId, CheckOutRequest request, string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate member
            var member = await _context.Members
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == memberId && x.IsActive,
                    cancellationToken);

            if (member is null)
            {
                throw new InvalidOperationException("Member not found.");
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Check existing attendance
            var attendance = await _context.MemberAttendances
                .FirstOrDefaultAsync(x => x.MemberId == memberId && x.AttendanceDate == today && x.IsActive, cancellationToken);

            if (attendance is null)
            {
                throw new InvalidOperationException("Member has not checked in today.");
            }

            if (!attendance.CheckInTime.HasValue)
            {
                throw new InvalidOperationException("Member has not checked in today.");
            }

            if (attendance.CheckOutTime.HasValue)
            {
                throw new InvalidOperationException("Member has already checked out.");
            }

            var checkOutTime = TimeOnly.FromDateTime(DateTime.UtcNow);

            if (checkOutTime <= attendance.CheckInTime.Value)
            {
                throw new InvalidOperationException("Check out time must be greater than check in time.");
            }

            attendance.CheckOutTime = checkOutTime;
            attendance.DurationMinutes = (int)(checkOutTime.ToTimeSpan() - attendance.CheckInTime.Value.ToTimeSpan()).TotalMinutes;
            attendance.Status = AttendanceStatus.Present;
            attendance.Remarks = request.Remarks;
            attendance.UpdatedAtUtc = DateTime.UtcNow;
            attendance.UpdatedBy = userId;

            await AttendanceSeatHelper.ReleaseSessionSeatAsync(
                _context,
                memberId,
                attendance.LibraryId,
                cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);
            return new AttendanceResponse
            {
                Id = attendance.Id,
                MemberId = attendance.MemberId,
                AttendanceDate = attendance.AttendanceDate,
                CheckInTime = attendance.CheckInTime,
                CheckOutTime = attendance.CheckOutTime,
                DurationMinutes = attendance.DurationMinutes,
                Status = attendance.Status,
                Source = attendance.Source,
                SeatNo = attendance.SeatNo,
                Remarks = attendance.Remarks,
                IsActive = attendance.IsActive,
                CheckInAtUtc = attendance.CheckInTime.HasValue
                    ? attendance.AttendanceDate.ToDateTime(attendance.CheckInTime.Value, DateTimeKind.Utc)
                    : null,
                CheckOutAtUtc = attendance.CheckOutTime.HasValue
                    ? attendance.AttendanceDate.ToDateTime(attendance.CheckOutTime.Value, DateTimeKind.Utc)
                    : null,
            };

        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while checking out member {MemberId}", memberId);
            throw new ApplicationException("Unable to check out member. Please try again later.");
        }
    }

    public Task<Contracts.Organizations.Requests.AttendanceResponse> CreateAsync(CreateAttendanceRequest request, string userId, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task DeleteAsync(Guid attendanceId, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

   public async Task<IReadOnlyList<AttendanceResponse>> GetAttendanceCalendarAsync(Guid memberId, int month, int year, CancellationToken cancellationToken)
    {
        try
        {
            if (memberId == Guid.Empty)
            {
                throw new ArgumentException("Member is required.");
            }

            if (month < 1 || month > 12)
            {
                throw new ArgumentException("Invalid month.");
            }

            if (year < 2000 || year > 2100)
            {
                throw new ArgumentException("Invalid year.");
            }

            var memberExists = await _context.Members
                .AsNoTracking()
                .AnyAsync(x => x.Id == memberId, cancellationToken);

            if (!memberExists)
            {
                throw new InvalidOperationException("Member not found.");
            }

            var startDate = new DateOnly(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var attendances = await _context.MemberAttendances
                .AsNoTracking()
                .Where(x =>
                    x.MemberId == memberId &&
                    x.AttendanceDate >= startDate &&
                    x.AttendanceDate <= endDate)
                .ToDictionaryAsync(
                    x => x.AttendanceDate,
                    cancellationToken);

            var result = new List<AttendanceResponse>();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                if (date > today)
                {
                    continue;
                }

                if (attendances.TryGetValue(date, out var attendance))
                {
                    result.Add(new AttendanceResponse
                    {
                        Id = attendance.Id,
                        MemberId = attendance.MemberId,
                        AttendanceDate = attendance.AttendanceDate,
                        Status = attendance.Status,
                        Source = attendance.Source,
                        SeatNo = attendance.SeatNo,
                        CheckInTime = attendance.CheckInTime,
                        CheckOutTime = attendance.CheckOutTime,
                        DurationMinutes = attendance.DurationMinutes,
                        Remarks = attendance.Remarks,
                        IsActive = attendance.IsActive,
                        IsWeekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday,
                        IsHoliday = attendance.Status is AttendanceStatus.Holiday or AttendanceStatus.Leave,
                        HolidayName = attendance.Status == AttendanceStatus.Holiday ? "Holiday" : null,
                        CheckInAtUtc = attendance.CheckInTime.HasValue
                        ? attendance.AttendanceDate.ToDateTime(attendance.CheckInTime.Value, DateTimeKind.Utc)
                        : null,

                        CheckOutAtUtc = attendance.CheckOutTime.HasValue
                        ? attendance.AttendanceDate.ToDateTime(attendance.CheckOutTime.Value, DateTimeKind.Utc)
                        : null,
                    });
                }
                else
                {
                    var isWeekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

                    result.Add(new AttendanceResponse
                    {
                        Id = CreateSyntheticAttendanceId(memberId, date),
                        MemberId = memberId,
                        AttendanceDate = date,
                        Status = isWeekend
                            ? AttendanceStatus.Holiday
                            : AttendanceStatus.Absent,

                        CheckInTime = null,
                        CheckOutTime = null,
                        DurationMinutes = 0,
                        Remarks = null,
                        IsActive = true,
                        IsWeekend = isWeekend,
                        IsHoliday = isWeekend,
                        HolidayName = isWeekend ? "Weekend" : null
                    });
                }
            }

            return result;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError( ex, "Error getting monthly attendance for Member {MemberId}", memberId);
            throw new ApplicationException( "Unable to retrieve monthly attendance.");
        }
    }

    public Task<IReadOnlyCollection<AttendanceResponse>> GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<int> GetCurrentSessionMinutesAsync(Guid memberId, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<PagedResult<AttendanceHistoryResponse>> GetHistoryAsync(Guid memberId, int page, int pageSize, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<IReadOnlyList<AttendanceHistoryResponse>> GetMonthlyAttendanceAsync(Guid memberId, int month, int year, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public async Task<AttendanceStatisticsResponse> GetStatisticsAsync(Guid memberId, CancellationToken cancellationToken)
    {
        if (memberId == Guid.Empty)
        {
            throw new ArgumentException("Member is required.");
        }

        var memberExists = await _context.Members
            .AsNoTracking()
            .AnyAsync(x => x.Id == memberId, cancellationToken);

        if (!memberExists)
        {
            throw new InvalidOperationException("Member not found.");
        }

        const int windowDays = 90;
        var endDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDate = endDate.AddDays(-(windowDays - 1));

        var calendar = await GetAttendanceCalendarRangeAsync(memberId, startDate, endDate, cancellationToken);

        var presentDays = calendar.Count(x => x.Status is AttendanceStatus.Present
            or AttendanceStatus.CheckedIn
            or AttendanceStatus.CheckedOut
            or AttendanceStatus.AutoCheckedOut
            or AttendanceStatus.MissedCheckout
            or AttendanceStatus.HalfDay);
        var lateDays = calendar.Count(x => x.Status == AttendanceStatus.Late);
        var absentDays = calendar.Count(x => x.Status == AttendanceStatus.Absent);
        var leaveDays = calendar.Count(x => x.Status is AttendanceStatus.Leave or AttendanceStatus.Holiday);
        var workDays = calendar.Count - leaveDays;
        var attendancePercentage = workDays > 0
            ? Math.Round((double)(presentDays + lateDays) / workDays * 100, 1)
            : 0;

        var totalStudyMinutes = calendar.Sum(x => x.DurationMinutes);

        var ordered = calendar
            .OrderBy(x => x.AttendanceDate)
            .ToList();

        var currentStreak = 0;
        var longestStreak = 0;
        var streak = 0;

        foreach (var day in ordered)
        {
            if (day.Status is AttendanceStatus.Present
                or AttendanceStatus.CheckedIn
                or AttendanceStatus.CheckedOut
                or AttendanceStatus.AutoCheckedOut
                or AttendanceStatus.MissedCheckout
                or AttendanceStatus.HalfDay
                or AttendanceStatus.Late)
            {
                streak++;
                longestStreak = Math.Max(longestStreak, streak);
            }
            else if (day.Status == AttendanceStatus.Absent)
            {
                streak = 0;
            }
        }

        for (var i = ordered.Count - 1; i >= 0; i--)
        {
            var day = ordered[i];
            if (day.Status is AttendanceStatus.Present
                or AttendanceStatus.CheckedIn
                or AttendanceStatus.CheckedOut
                or AttendanceStatus.AutoCheckedOut
                or AttendanceStatus.MissedCheckout
                or AttendanceStatus.HalfDay
                or AttendanceStatus.Late)
            {
                currentStreak++;
            }
            else if (day.Status == AttendanceStatus.Absent)
            {
                break;
            }
        }

        return new AttendanceStatisticsResponse
        {
            TotalDays = calendar.Count,
            PresentDays = presentDays,
            AbsentDays = absentDays,
            LeaveDays = leaveDays,
            LateDays = lateDays,
            AttendancePercentage = attendancePercentage,
            TotalStudyMinutes = totalStudyMinutes,
            CurrentStreak = currentStreak,
            LongestStreak = longestStreak,
        };
    }

    public Task<Contracts.Organizations.Requests.AttendanceResponse?> GetTodayAttendanceAsync(Guid memberId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }

    public Task<bool> IsCheckedInAsync(Guid memberId, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public async Task<AttendanceResponse> UpdateAsync(
        Guid attendanceId,
        UpdateAttendanceRequest request,
        string userId,
        CancellationToken cancellationToken)
    {
        var attendance = await _context.MemberAttendances
            .FirstOrDefaultAsync(x => x.Id == attendanceId && x.IsActive && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Attendance record not found.");

        if (request.CheckInTime.HasValue)
        {
            attendance.CheckInTime = request.CheckInTime;
        }

        attendance.CheckOutTime = request.CheckOutTime;

        if (attendance.CheckInTime.HasValue && attendance.CheckOutTime.HasValue)
        {
            if (attendance.CheckOutTime.Value <= attendance.CheckInTime.Value)
            {
                throw new InvalidOperationException("Check-out time must be after check-in time.");
            }

            attendance.DurationMinutes = (int)(attendance.CheckOutTime.Value.ToTimeSpan()
                - attendance.CheckInTime.Value.ToTimeSpan()).TotalMinutes;
            attendance.Status = AttendanceStatus.Present;
        }
        else if (attendance.CheckInTime.HasValue)
        {
            attendance.CheckOutTime = null;
            attendance.DurationMinutes = 0;
            attendance.Status = AttendanceStatus.CheckedIn;
        }

        if (!string.IsNullOrWhiteSpace(request.SeatNumber))
        {
            var seatNumber = await AttendanceSeatHelper.ValidateSeatForCheckInAsync(
                _context,
                attendance.LibraryId,
                attendance.MemberId,
                request.SeatNumber,
                cancellationToken);
            attendance.SeatNo = seatNumber;

            if (attendance.Status == AttendanceStatus.CheckedIn)
            {
                await AttendanceSeatHelper.AssignSessionSeatAsync(
                    _context,
                    attendance.MemberId,
                    attendance.LibraryId,
                    seatNumber,
                    cancellationToken);
            }
        }

        attendance.Remarks = request.Remarks;
        attendance.IsActive = request.IsActive;
        attendance.UpdatedAtUtc = DateTime.UtcNow;
        attendance.UpdatedBy = userId;

        await _context.SaveChangesAsync(cancellationToken);

        return new AttendanceResponse
        {
            Id = attendance.Id,
            MemberId = attendance.MemberId,
            AttendanceDate = attendance.AttendanceDate,
            CheckInTime = attendance.CheckInTime,
            CheckOutTime = attendance.CheckOutTime,
            DurationMinutes = attendance.DurationMinutes,
            Status = attendance.Status,
            Source = attendance.Source,
            SeatNo = attendance.SeatNo,
            Remarks = attendance.Remarks,
            IsActive = attendance.IsActive,
            CheckInAtUtc = attendance.CheckInTime.HasValue
                ? attendance.AttendanceDate.ToDateTime(attendance.CheckInTime.Value, DateTimeKind.Utc)
                : null,
            CheckOutAtUtc = attendance.CheckOutTime.HasValue
                ? attendance.AttendanceDate.ToDateTime(attendance.CheckOutTime.Value, DateTimeKind.Utc)
                : null,
        };
    }

    Task<IReadOnlyCollection<Contracts.Organizations.Requests.AttendanceResponse>> IAttendanceService.GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public async Task<IReadOnlyList<AttendanceSeatOptionResponse>> GetLibrarySeatsAsync(
        Guid libraryId,
        CancellationToken cancellationToken = default)
    {
        if (libraryId == Guid.Empty)
        {
            throw new ArgumentException("Library is required.");
        }

        return await AttendanceSeatHelper.GetSeatOptionsAsync(_context, libraryId, cancellationToken);
    }

    public async Task<AttendanceModuleSummaryResponse> GetModuleSummaryAsync(
        AttendanceModuleQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var (dateFrom, dateTo) = NormalizeModuleDateRange(query);
        var scopedQuery = await BuildScopedAttendanceQueryAsync(userId, query.LibraryId, cancellationToken);
        var filtered = ApplyModuleFilters(scopedQuery, query, dateFrom, dateTo);

        var accessibleLibraries = query.LibraryId.HasValue
            ? 1
            : (await _libraryService.GetAccessibleLibraryIdsAsync(userId, cancellationToken)).Count;

        return new AttendanceModuleSummaryResponse
        {
            TotalRecords = await filtered.CountAsync(cancellationToken),
            UniqueMembers = await filtered.Select(x => x.MemberId).Distinct().CountAsync(cancellationToken),
            CurrentlyCheckedIn = await filtered.CountAsync(
                x => x.CheckInTime.HasValue && !x.CheckOutTime.HasValue,
                cancellationToken),
            CheckedOut = await filtered.CountAsync(x => x.CheckOutTime.HasValue, cancellationToken),
            AccessibleLibraries = accessibleLibraries,
            DateFrom = dateFrom,
            DateTo = dateTo,
        };
    }

    public async Task<PagedResult<AttendanceRecordListItemResponse>> GetModuleRecordsAsync(
        AttendanceModuleQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var (dateFrom, dateTo) = NormalizeModuleDateRange(query);
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 100 ? 20 : query.PageSize;

        var scopedQuery = await BuildScopedAttendanceQueryAsync(userId, query.LibraryId, cancellationToken);
        var filtered = ApplyModuleFilters(scopedQuery, query, dateFrom, dateTo);

        var totalCount = await filtered.CountAsync(cancellationToken);

        var items = await (
            from attendance in filtered
            join member in _context.Members.AsNoTracking() on attendance.MemberId equals member.Id
            join library in _context.Libraries.AsNoTracking() on attendance.LibraryId equals library.Id
            join branch in _context.Branches.AsNoTracking() on library.BranchId equals branch.Id
            join institution in _context.Institutions.AsNoTracking() on library.InstitutionId equals institution.Id
            orderby attendance.AttendanceDate descending, attendance.CheckInTime descending, member.FullName
            select new AttendanceRecordListItemResponse
            {
                Id = attendance.Id,
                MemberId = attendance.MemberId,
                MemberName = member.FullName,
                MembershipNo = member.MembershipNo,
                Shift = member.Shift,
                LibraryId = attendance.LibraryId,
                LibraryName = library.Name,
                BranchName = branch.Name,
                InstitutionName = institution.Name,
                AttendanceDate = attendance.AttendanceDate,
                CheckInTime = attendance.CheckInTime,
                CheckOutTime = attendance.CheckOutTime,
                CheckInAtUtc = attendance.CheckInTime.HasValue
                    ? attendance.AttendanceDate.ToDateTime(attendance.CheckInTime.Value, DateTimeKind.Utc)
                    : null,
                CheckOutAtUtc = attendance.CheckOutTime.HasValue
                    ? attendance.AttendanceDate.ToDateTime(attendance.CheckOutTime.Value, DateTimeKind.Utc)
                    : null,
                DurationMinutes = attendance.DurationMinutes,
                Status = attendance.Status,
                Source = attendance.Source,
                SeatNo = attendance.SeatNo,
            })
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<AttendanceRecordListItemResponse>(items, totalCount, page, pageSize);
    }

    public async Task<AttendanceAnalyticsResponse> GetModuleAnalyticsAsync(
        AttendanceAnalyticsQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var days = NormalizeAnalyticsDays(query.Days);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dateFrom = today.AddDays(-(days - 1));
        var dateTo = today;

        var scopedQuery = await BuildScopedAttendanceQueryAsync(userId, query.LibraryId, cancellationToken);
        var rangeQuery = scopedQuery.Where(x => x.AttendanceDate >= dateFrom && x.AttendanceDate <= dateTo);

        var accessibleLibraryIds = query.LibraryId.HasValue
            ? new List<Guid> { query.LibraryId.Value }
            : (await _libraryService.GetAccessibleLibraryIdsAsync(userId, cancellationToken)).ToList();

        var totalCapacity = accessibleLibraryIds.Count == 0
            ? 0
            : await _context.Libraries
                .AsNoTracking()
                .Where(l => accessibleLibraryIds.Contains(l.Id) && !l.IsDeleted && l.IsActive)
                .SumAsync(l => l.Capacity ?? 0, cancellationToken);

        var trend = new List<AttendanceTrendDayResponse>();
        for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
        {
            var dayQuery = rangeQuery.Where(x => x.AttendanceDate == date);
            var present = await dayQuery
                .Where(x => x.CheckInTime.HasValue)
                .Select(x => x.MemberId)
                .Distinct()
                .CountAsync(cancellationToken);
            var late = await dayQuery.CountAsync(x => x.Status == AttendanceStatus.Late, cancellationToken);
            var absent = Math.Max(0, totalCapacity - present);

            trend.Add(new AttendanceTrendDayResponse
            {
                Date = date,
                Label = date.ToString("MM-dd"),
                Present = present,
                Late = late,
                Absent = absent,
            });
        }

        var presentTotal = trend.Sum(x => x.Present);
        var lateTotal = trend.Sum(x => x.Late);
        var absentTotal = trend.Sum(x => x.Absent);
        var attendanceRate = presentTotal + absentTotal > 0
            ? Math.Round(presentTotal / (double)(presentTotal + absentTotal) * 100d, 1)
            : 0d;
        var avgDailyPresent = trend.Count > 0
            ? (int)Math.Round(presentTotal / (double)trend.Count)
            : 0;

        var shiftMix = await (
            from attendance in rangeQuery.Where(x => x.CheckInTime.HasValue)
            join member in _context.Members.AsNoTracking() on attendance.MemberId equals member.Id
            group attendance by (member.Shift ?? "Unassigned") into grouped
            select new AttendanceShiftMixItemResponse
            {
                Shift = grouped.Key,
                Count = grouped.Select(x => x.MemberId).Distinct().Count(),
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync(cancellationToken);

        var hourlyRaw = await rangeQuery
            .Where(x => x.AttendanceDate == today && x.CheckInTime.HasValue)
            .GroupBy(x => x.CheckInTime!.Value.Hour)
            .Select(group => new { Hour = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var hourlyToday = Enumerable.Range(6, 16)
            .Select(hour =>
            {
                var count = hourlyRaw.FirstOrDefault(x => x.Hour == hour)?.Count ?? 0;
                return new AttendanceHourlyCheckInResponse
                {
                    Hour = hour,
                    Label = FormatHourLabel(hour),
                    CheckIns = count,
                };
            })
            .ToList();

        var peak = hourlyToday
            .OrderByDescending(x => x.CheckIns)
            .FirstOrDefault(x => x.CheckIns > 0);

        var todayQuery = scopedQuery.Where(x => x.AttendanceDate == today);
        var currentlyCheckedIn = await todayQuery.CountAsync(
            x => x.CheckInTime.HasValue && !x.CheckOutTime.HasValue,
            cancellationToken);

        return new AttendanceAnalyticsResponse
        {
            Days = days,
            DateFrom = dateFrom,
            DateTo = dateTo,
            PresentTotal = presentTotal,
            LateTotal = lateTotal,
            AbsentTotal = absentTotal,
            AttendanceRate = attendanceRate,
            AvgDailyPresent = avgDailyPresent,
            PeakHourLabel = peak?.Label ?? "—",
            PeakHourCheckIns = peak?.CheckIns ?? 0,
            CurrentlyCheckedIn = currentlyCheckedIn,
            AccessibleLibraries = accessibleLibraryIds.Count,
            Trend = trend,
            ShiftMix = shiftMix,
            HourlyToday = hourlyToday,
        };
    }

    public async Task<IReadOnlyList<AttendanceLiveEventResponse>> GetLiveFeedAsync(
        Guid? libraryId,
        int limit,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var normalizedLimit = limit is < 1 or > 100 ? 20 : limit;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var scopedQuery = await BuildScopedAttendanceQueryAsync(userId, libraryId, cancellationToken);

        var rows = await (
            from attendance in scopedQuery.Where(x => x.AttendanceDate == today)
            join member in _context.Members.AsNoTracking() on attendance.MemberId equals member.Id
            join library in _context.Libraries.AsNoTracking() on attendance.LibraryId equals library.Id
            select new
            {
                attendance.Id,
                attendance.MemberId,
                member.FullName,
                member.Shift,
                attendance.SeatNo,
                library.Name,
                attendance.CheckInTime,
                attendance.CheckOutTime,
                attendance.AttendanceDate,
            })
            .ToListAsync(cancellationToken);

        var events = new List<AttendanceLiveEventResponse>();
        foreach (var row in rows)
        {
            if (row.CheckInTime.HasValue)
            {
                events.Add(new AttendanceLiveEventResponse
                {
                    Id = $"{row.Id:N}-in",
                    MemberId = row.MemberId,
                    MemberName = row.FullName,
                    SeatNo = row.SeatNo,
                    Shift = row.Shift,
                    LibraryName = row.Name,
                    Direction = "in",
                    OccurredAtUtc = row.AttendanceDate.ToDateTime(row.CheckInTime.Value, DateTimeKind.Utc),
                });
            }

            if (row.CheckOutTime.HasValue)
            {
                events.Add(new AttendanceLiveEventResponse
                {
                    Id = $"{row.Id:N}-out",
                    MemberId = row.MemberId,
                    MemberName = row.FullName,
                    SeatNo = row.SeatNo,
                    Shift = row.Shift,
                    LibraryName = row.Name,
                    Direction = "out",
                    OccurredAtUtc = row.AttendanceDate.ToDateTime(row.CheckOutTime.Value, DateTimeKind.Utc),
                });
            }
        }

        return events
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(normalizedLimit)
            .ToList();
    }

    public async Task<AttendanceCalendarMonthResponse> GetModuleCalendarMonthAsync(
        AttendanceCalendarMonthQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (query.Year is < 2000 or > 2100 || query.Month is < 1 or > 12)
        {
            throw new InvalidOperationException("Invalid year or month.");
        }

        var firstDay = new DateOnly(query.Year, query.Month, 1);
        var lastDay = firstDay.AddMonths(1).AddDays(-1);

        var scopedQuery = await BuildScopedAttendanceQueryAsync(userId, query.LibraryId, cancellationToken);
        var libraryIds = await GetScopedLibraryIdsAsync(userId, query.LibraryId, cancellationToken);
        var enrolled = await GetEnrolledMemberCountAsync(libraryIds, cancellationToken);

        var dayStats = await scopedQuery
            .Where(x => x.AttendanceDate >= firstDay && x.AttendanceDate <= lastDay && x.CheckInTime.HasValue)
            .GroupBy(x => x.AttendanceDate)
            .Select(g => new
            {
                Date = g.Key,
                Present = g.Select(x => x.MemberId).Distinct().Count(),
                Late = g.Count(x => x.Status == AttendanceStatus.Late),
            })
            .ToListAsync(cancellationToken);

        var statsByDate = dayStats.ToDictionary(x => x.Date);
        var days = new List<AttendanceCalendarDayCellResponse>();

        for (var date = firstDay; date <= lastDay; date = date.AddDays(1))
        {
            statsByDate.TryGetValue(date, out var stat);
            var present = stat?.Present ?? 0;
            var late = stat?.Late ?? 0;
            var absent = Math.Max(0, enrolled - present);

            days.Add(new AttendanceCalendarDayCellResponse
            {
                Date = date,
                Present = present,
                Late = late,
                Absent = absent,
                Assigned = enrolled,
                IntensityPercent = enrolled > 0 ? (int)Math.Round(present * 100.0 / enrolled) : 0,
            });
        }

        return new AttendanceCalendarMonthResponse
        {
            Year = query.Year,
            Month = query.Month,
            EnrolledMembers = enrolled,
            Days = days,
        };
    }

    public async Task<AttendanceCalendarSummaryResponse> GetModuleCalendarSummaryAsync(
        AttendanceCalendarSummaryQuery query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dateFrom = query.DateFrom ?? today;
        var dateTo = query.DateTo ?? today;

        if (dateTo < dateFrom)
        {
            throw new InvalidOperationException("End date must be on or after start date.");
        }

        if (dateTo.DayNumber - dateFrom.DayNumber > 366)
        {
            throw new InvalidOperationException("Date range cannot exceed 366 days.");
        }

        var libraryIds = await GetScopedLibraryIdsAsync(userId, query.LibraryId, cancellationToken);
        var scopedQuery = await BuildScopedAttendanceQueryAsync(userId, query.LibraryId, cancellationToken);

        var members = await (
            from ml in _context.MemberLibraries.AsNoTracking()
            join member in _context.Members.AsNoTracking() on ml.MemberId equals member.Id
            where !ml.IsDeleted && ml.IsCurrent && libraryIds.Contains(ml.LibraryId)
            select new { member.Id, Shift = member.Shift ?? "Unassigned" })
            .Distinct()
            .ToListAsync(cancellationToken);

        var memberIds = members.Select(x => x.Id).ToHashSet();
        var attendanceRows = await scopedQuery
            .Where(x => x.AttendanceDate >= dateFrom && x.AttendanceDate <= dateTo && memberIds.Contains(x.MemberId))
            .Select(x => new { x.MemberId, x.AttendanceDate, x.CheckInTime, x.CheckOutTime, x.Status })
            .ToListAsync(cancellationToken);

        var presentLookup = attendanceRows
            .Where(x => x.CheckInTime.HasValue)
            .GroupBy(x => (x.AttendanceDate, x.MemberId))
            .ToDictionary(g => g.Key, g => g.First());

        var shiftBuckets = members
            .Select(x => x.Shift)
            .Distinct()
            .ToDictionary(
                shift => shift,
                shift => new AttendanceCalendarShiftSummaryResponse { Shift = shift });

        var totalAssigned = 0;
        var totalCheckIns = 0;
        var totalCheckOuts = 0;
        var totalLate = 0;
        var totalAbsent = 0;

        for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
        {
            foreach (var member in members)
            {
                var bucket = shiftBuckets[member.Shift];
                bucket.Assigned++;
                totalAssigned++;

                if (presentLookup.TryGetValue((date, member.Id), out var row))
                {
                    bucket.CheckIns++;
                    totalCheckIns++;

                    if (row.CheckOutTime.HasValue)
                    {
                        bucket.CheckOuts++;
                        totalCheckOuts++;
                    }

                    if (row.Status == AttendanceStatus.Late)
                    {
                        bucket.Late++;
                        totalLate++;
                    }
                }
                else
                {
                    bucket.Absent++;
                    totalAbsent++;
                }
            }
        }

        return new AttendanceCalendarSummaryResponse
        {
            DateFrom = dateFrom,
            DateTo = dateTo,
            Assigned = totalAssigned,
            CheckIns = totalCheckIns,
            CheckOuts = totalCheckOuts,
            Late = totalLate,
            Absent = totalAbsent,
            ByShift = shiftBuckets.Values.OrderBy(x => x.Shift).ToList(),
        };
    }

    private async Task<IReadOnlyCollection<Guid>> GetScopedLibraryIdsAsync(
        Guid userId,
        Guid? libraryId,
        CancellationToken cancellationToken)
    {
        if (libraryId.HasValue)
        {
            if (!await _libraryService.UserCanAccessLibraryAsync(libraryId.Value, userId, cancellationToken))
            {
                throw new UnauthorizedAccessException("You do not have access to this library.");
            }

            return [libraryId.Value];
        }

        return await _libraryService.GetAccessibleLibraryIdsAsync(userId, cancellationToken);
    }

    private async Task<int> GetEnrolledMemberCountAsync(
        IReadOnlyCollection<Guid> libraryIds,
        CancellationToken cancellationToken)
    {
        if (libraryIds.Count == 0)
        {
            return 0;
        }

        return await _context.MemberLibraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsCurrent && libraryIds.Contains(x.LibraryId))
            .Select(x => x.MemberId)
            .Distinct()
            .CountAsync(cancellationToken);
    }

    private async Task<IQueryable<MemberAttendance>> BuildScopedAttendanceQueryAsync(
        Guid userId,
        Guid? libraryId,
        CancellationToken cancellationToken)
    {
        var query = _context.MemberAttendances
            .AsNoTracking()
            .Where(x => x.IsActive && !x.IsDeleted);

        if (libraryId.HasValue)
        {
            if (!await _libraryService.UserCanAccessLibraryAsync(libraryId.Value, userId, cancellationToken))
            {
                throw new UnauthorizedAccessException("You do not have access to this library.");
            }

            return query.Where(x => x.LibraryId == libraryId.Value);
        }

        var accessibleLibraryIds = await _libraryService.GetAccessibleLibraryIdsAsync(userId, cancellationToken);
        if (accessibleLibraryIds.Count == 0)
        {
            return query.Where(_ => false);
        }

        return query.Where(x => accessibleLibraryIds.Contains(x.LibraryId));
    }

    private IQueryable<MemberAttendance> ApplyModuleFilters(
        IQueryable<MemberAttendance> query,
        AttendanceModuleQuery moduleQuery,
        DateOnly dateFrom,
        DateOnly dateTo)
    {
        query = query.Where(x => x.AttendanceDate >= dateFrom && x.AttendanceDate <= dateTo);

        if (moduleQuery.Status.HasValue)
        {
            query = query.Where(x => x.Status == moduleQuery.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(moduleQuery.Search))
        {
            var term = moduleQuery.Search.Trim();
            query = query.Where(x =>
                _context.Members.Any(m =>
                    m.Id == x.MemberId &&
                    (m.FullName.Contains(term) || m.MembershipNo.Contains(term))) ||
                (x.SeatNo != null && x.SeatNo.Contains(term)));
        }

        return query;
    }

    private static (DateOnly DateFrom, DateOnly DateTo) NormalizeModuleDateRange(AttendanceModuleQuery query)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dateFrom = query.DateFrom ?? today;
        var dateTo = query.DateTo ?? today;

        if (dateTo < dateFrom)
        {
            throw new InvalidOperationException("End date must be on or after start date.");
        }

        if (dateTo.DayNumber - dateFrom.DayNumber > 366)
        {
            throw new InvalidOperationException("Date range cannot exceed 366 days.");
        }

        return (dateFrom, dateTo);
    }

    private static int NormalizeAnalyticsDays(int days) =>
        days switch
        {
            7 => 7,
            30 => 30,
            _ => 14,
        };

    private static string FormatHourLabel(int hour)
    {
        var display = hour % 12;
        if (display == 0)
        {
            display = 12;
        }

        return hour < 12 ? $"{display}a" : $"{display}p";
    }

    private static Guid CreateSyntheticAttendanceId(Guid memberId, DateOnly date)
    {
        var bytes = new byte[16];
        memberId.ToByteArray().CopyTo(bytes, 0);
        BitConverter.GetBytes(date.DayNumber).CopyTo(bytes, 12);
        return new Guid(bytes);
    }

    public async Task<IReadOnlyList<AttendanceResponse>> GetMemberRecordsAsync(
        Guid memberId,
        DateOnly dateFrom,
        DateOnly dateTo,
        CancellationToken cancellationToken = default)
    {
        if (memberId == Guid.Empty)
        {
            throw new ArgumentException("Member is required.");
        }

        if (dateTo < dateFrom)
        {
            throw new InvalidOperationException("End date must be on or after start date.");
        }

        if (dateTo.DayNumber - dateFrom.DayNumber > 366)
        {
            throw new InvalidOperationException("Date range cannot exceed 366 days.");
        }

        var memberExists = await _context.Members
            .AsNoTracking()
            .AnyAsync(x => x.Id == memberId && !x.IsDeleted, cancellationToken);

        if (!memberExists)
        {
            throw new InvalidOperationException("Member not found.");
        }

        return await _context.MemberAttendances
            .AsNoTracking()
            .Where(x =>
                x.MemberId == memberId &&
                !x.IsDeleted &&
                x.IsActive &&
                x.AttendanceDate >= dateFrom &&
                x.AttendanceDate <= dateTo)
            .OrderByDescending(x => x.AttendanceDate)
            .ThenByDescending(x => x.CheckInTime)
            .Select(a => new AttendanceResponse
            {
                Id = a.Id,
                MemberId = a.MemberId,
                AttendanceDate = a.AttendanceDate,
                CheckInTime = a.CheckInTime,
                CheckOutTime = a.CheckOutTime,
                DurationMinutes = a.DurationMinutes,
                Status = a.Status,
                Source = a.Source,
                SeatNo = a.SeatNo,
                Remarks = a.Remarks,
                IsActive = a.IsActive,
                CheckInAtUtc = a.CheckInTime.HasValue
                    ? a.AttendanceDate.ToDateTime(a.CheckInTime.Value, DateTimeKind.Utc)
                    : null,
                CheckOutAtUtc = a.CheckOutTime.HasValue
                    ? a.AttendanceDate.ToDateTime(a.CheckOutTime.Value, DateTimeKind.Utc)
                    : null,
            })
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<AttendanceResponse>> GetAttendanceCalendarRangeAsync(
        Guid memberId,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken)
    {
        var months = new HashSet<(int Year, int Month)>();
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            months.Add((date.Year, date.Month));
        }

        var records = new List<AttendanceResponse>();
        foreach (var (year, month) in months.OrderBy(x => x.Year).ThenBy(x => x.Month))
        {
            var monthRecords = await GetAttendanceCalendarAsync(memberId, month, year, cancellationToken);
            records.AddRange(monthRecords.Where(x => x.AttendanceDate >= startDate && x.AttendanceDate <= endDate));
        }

        return records
            .GroupBy(x => x.AttendanceDate)
            .Select(g => g.First())
            .OrderBy(x => x.AttendanceDate)
            .ToList();
    }
}
