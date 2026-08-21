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
    private readonly ILogger<AttendanceService> _logger;

    public AttendanceService(ApplicationDbContext context, ILogger<AttendanceService> logger)
    {
        _context = context;
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

    private static Guid CreateSyntheticAttendanceId(Guid memberId, DateOnly date)
    {
        var bytes = new byte[16];
        memberId.ToByteArray().CopyTo(bytes, 0);
        BitConverter.GetBytes(date.DayNumber).CopyTo(bytes, 12);
        return new Guid(bytes);
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
