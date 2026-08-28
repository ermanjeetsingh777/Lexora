using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Helpers;

public static class AttendanceSeatHelper
{
    private sealed record SeatSource(Guid? Id, string Number, bool IsActive);

    public static async Task<IReadOnlyList<AttendanceSeatOptionResponse>> GetSeatOptionsAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        var library = await dbContext.Libraries
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == libraryId && !l.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Library not found.");

        var dbSeats = await dbContext.Seats
            .AsNoTracking()
            .Where(x => x.LibraryId == libraryId)
            .OrderBy(x => x.SeatNumber)
            .Select(x => new SeatSource(x.Id, x.SeatNumber, x.IsActive))
            .ToListAsync(cancellationToken);

        var sources = dbSeats.Count > 0
            ? dbSeats
            : BuildVirtualSeats(libraryId, library.Capacity ?? 0);

        var todaySessions = await GetTodaySeatSessionsByNumberAsync(dbContext, libraryId, cancellationToken);
        var occupancy = await GetActiveSessionOccupancyAsync(dbContext, libraryId, cancellationToken);

        return sources
            .Select(source =>
            {
                occupancy.TryGetValue(source.Number, out var occupant);
                todaySessions.TryGetValue(source.Number, out var sessions);
                var lastVacated = occupant == null && sessions != null && sessions.Count > 0
                    ? sessions.LastOrDefault(s => !s.IsActive)
                    : null;

                return new AttendanceSeatOptionResponse
                {
                    SeatId = source.Id,
                    SeatNumber = source.Number,
                    IsActive = source.IsActive,
                    IsOccupied = occupant != null,
                    OccupiedBy = occupant,
                    LastVacatedBy = lastVacated?.MemberName,
                    LastVacatedAtUtc = lastVacated?.CheckOutAtUtc,
                };
            })
            .ToList();
    }

    public static async Task<string> ValidateSeatForCheckInAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        Guid memberId,
        string? seatNumber,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(seatNumber))
        {
            throw new InvalidOperationException("Please select a seat before checking in.");
        }

        var normalized = seatNumber.Trim();
        var options = await GetSeatOptionsAsync(dbContext, libraryId, cancellationToken);
        var seat = options.FirstOrDefault(x =>
            string.Equals(x.SeatNumber, normalized, StringComparison.OrdinalIgnoreCase));

        if (seat is null)
        {
            throw new InvalidOperationException($"Seat {normalized} is not valid for this library.");
        }

        if (!seat.IsActive)
        {
            throw new InvalidOperationException($"Seat {normalized} is not available.");
        }

        if (seat.IsOccupied)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var ownsSeat = await dbContext.MemberAttendances
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MemberId == memberId
                    && x.LibraryId == libraryId
                    && x.AttendanceDate == today
                    && x.IsActive
                    && x.CheckInTime.HasValue
                    && x.CheckOutTime == null
                    && x.SeatNo != null
                    && x.SeatNo.ToLower() == normalized.ToLower(),
                    cancellationToken);

            if (!ownsSeat)
            {
                throw new InvalidOperationException($"Seat {normalized} is already occupied.");
            }
        }

        return seat.SeatNumber;
    }

    public static async Task AssignSessionSeatAsync(
        ApplicationDbContext dbContext,
        Guid memberId,
        Guid libraryId,
        string seatNumber,
        CancellationToken cancellationToken)
    {
        var memberLibrary = await dbContext.MemberLibraries
            .FirstOrDefaultAsync(x =>
                x.MemberId == memberId
                && x.LibraryId == libraryId
                && x.IsActive
                && !x.IsDeleted,
                cancellationToken);

        if (memberLibrary is null)
        {
            return;
        }

        var seat = await dbContext.Seats
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.LibraryId == libraryId
                && x.SeatNumber == seatNumber,
                cancellationToken);

        memberLibrary.SeatId = seat?.Id;
        memberLibrary.UpdatedAtUtc = DateTime.UtcNow;
    }

    public static async Task ReleaseSessionSeatAsync(
        ApplicationDbContext dbContext,
        Guid memberId,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        var memberLibrary = await dbContext.MemberLibraries
            .FirstOrDefaultAsync(x =>
                x.MemberId == memberId
                && x.LibraryId == libraryId
                && x.IsActive
                && !x.IsDeleted,
                cancellationToken);

        if (memberLibrary is null)
        {
            return;
        }

        memberLibrary.SeatId = null;
        memberLibrary.UpdatedAtUtc = DateTime.UtcNow;
    }

    public sealed record SeatSessionInfo(
        string MemberName,
        string? MembershipNo,
        TimeOnly? CheckInTime,
        TimeOnly? CheckOutTime,
        DateTime? CheckInAtUtc,
        DateTime? CheckOutAtUtc,
        bool IsActive);

    public static async Task<Dictionary<string, List<SeatSessionInfo>>> GetTodaySeatSessionsByNumberAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var rows = await (
            from attendance in dbContext.MemberAttendances.AsNoTracking()
            join member in dbContext.Members.AsNoTracking() on attendance.MemberId equals member.Id
            where attendance.LibraryId == libraryId
                  && attendance.AttendanceDate == today
                  && attendance.IsActive
                  && !attendance.IsDeleted
                  && attendance.CheckInTime.HasValue
                  && attendance.SeatNo != null
                  && attendance.SeatNo != string.Empty
            orderby attendance.CheckInTime
            select new
            {
                attendance.SeatNo,
                MemberName = member.FullName ?? "Member",
                member.MembershipNo,
                attendance.AttendanceDate,
                attendance.CheckInTime,
                attendance.CheckOutTime,
            }
        ).ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.SeatNo!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => new SeatSessionInfo(
                    x.MemberName,
                    x.MembershipNo,
                    x.CheckInTime,
                    x.CheckOutTime,
                    x.CheckInTime.HasValue ? x.AttendanceDate.ToDateTime(x.CheckInTime.Value, DateTimeKind.Utc) : null,
                    x.CheckOutTime.HasValue ? x.AttendanceDate.ToDateTime(x.CheckOutTime.Value, DateTimeKind.Utc) : null,
                    x.CheckInTime.HasValue && !x.CheckOutTime.HasValue)).ToList(),
                StringComparer.OrdinalIgnoreCase);
    }

    public static async Task<Dictionary<string, string>> GetActiveSessionOccupancyAsync(
        ApplicationDbContext dbContext,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        var sessionsBySeat = await GetTodaySeatSessionsByNumberAsync(dbContext, libraryId, cancellationToken);

        return sessionsBySeat
            .Where(x => x.Value.Any(session => session.IsActive))
            .ToDictionary(
                x => x.Key,
                x => x.Value.First(session => session.IsActive).MemberName,
                StringComparer.OrdinalIgnoreCase);
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
            results.Add(new SeatSource(null, number, true));
        }

        return results;
    }
}
