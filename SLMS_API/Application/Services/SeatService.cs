using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class SeatService : ISeatService
{
    private readonly ApplicationDbContext _db;

    public SeatService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<SeatResponse>> GetByBranchAsync(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken = default)
    {
        await EnsureBranchAsync(institutionId, branchId, cancellationToken);

        var libraryIds = await _db.Libraries.AsNoTracking()
            .Where(l => l.BranchId == branchId && l.InstitutionId == institutionId && !l.IsDeleted)
            .Select(l => l.Id)
            .ToListAsync(cancellationToken);

        var seats = await _db.Seats.AsNoTracking()
            .Where(s => libraryIds.Contains(s.LibraryId))
            .OrderBy(s => s.SeatNumber)
            .ToListAsync(cancellationToken);

        var libraries = await _db.Libraries.AsNoTracking()
            .Where(l => libraryIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);

        var assignments = await _db.MemberLibraries.AsNoTracking()
            .Where(ml => ml.IsCurrent && !ml.IsDeleted && ml.SeatId != null && libraryIds.Contains(ml.LibraryId))
            .Select(ml => new
            {
                SeatId = ml.SeatId!.Value,
                ml.MemberId,
                MemberName = ml.Member.FullName,
            })
            .ToListAsync(cancellationToken);

        var bySeat = assignments
            .GroupBy(a => a.SeatId)
            .ToDictionary(g => g.Key, g => g.First());

        return seats.Select(s =>
        {
            bySeat.TryGetValue(s.Id, out var assigned);
            var status = !s.IsActive
                ? "Inactive"
                : assigned is not null ? "Occupied" : "Available";
            return new SeatResponse
            {
                Id = s.Id,
                LibraryId = s.LibraryId,
                LibraryName = libraries.GetValueOrDefault(s.LibraryId) ?? string.Empty,
                SeatNumber = s.SeatNumber,
                Status = status,
                AssignedMemberId = assigned?.MemberId,
                AssignedMemberName = assigned?.MemberName,
            };
        }).ToList();
    }

    public async Task<SeatResponse?> GetByIdAsync(
        Guid institutionId,
        Guid branchId,
        Guid seatId,
        CancellationToken cancellationToken = default)
    {
        var items = await GetByBranchAsync(institutionId, branchId, cancellationToken);
        return items.FirstOrDefault(x => x.Id == seatId);
    }

    public async Task<SeatResponse> CreateAsync(
        Guid institutionId,
        Guid branchId,
        CreateSeatRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureBranchAsync(institutionId, branchId, cancellationToken);

        if (request.LibraryId == Guid.Empty)
        {
            throw new InvalidOperationException("Library is required.");
        }

        var libraryOk = await _db.Libraries.AnyAsync(l =>
            l.Id == request.LibraryId
            && l.BranchId == branchId
            && l.InstitutionId == institutionId
            && !l.IsDeleted,
            cancellationToken);

        if (!libraryOk)
        {
            throw new InvalidOperationException("Library not found for this branch.");
        }

        var seatNumber = (request.SeatNumber ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(seatNumber))
        {
            throw new InvalidOperationException("Seat number is required.");
        }

        var duplicate = await _db.Seats.AnyAsync(s =>
            s.LibraryId == request.LibraryId && s.SeatNumber == seatNumber,
            cancellationToken);

        if (duplicate)
        {
            throw new InvalidOperationException($"Seat '{seatNumber}' already exists in this library.");
        }

        var seat = new Seat
        {
            Id = Guid.NewGuid(),
            LibraryId = request.LibraryId,
            SeatNumber = seatNumber,
            IsActive = true,
        };

        _db.Seats.Add(seat);
        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(institutionId, branchId, seat.Id, cancellationToken))!;
    }

    public async Task<SeatResponse> UpdateAsync(
        Guid institutionId,
        Guid branchId,
        Guid seatId,
        UpdateSeatRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureBranchAsync(institutionId, branchId, cancellationToken);

        var seat = await _db.Seats
            .FirstOrDefaultAsync(s => s.Id == seatId, cancellationToken)
            ?? throw new InvalidOperationException("Seat not found.");

        var libraryOk = await _db.Libraries.AnyAsync(l =>
            l.Id == seat.LibraryId
            && l.BranchId == branchId
            && l.InstitutionId == institutionId
            && !l.IsDeleted,
            cancellationToken);

        if (!libraryOk)
        {
            throw new InvalidOperationException("Seat not found for this branch.");
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            seat.IsActive = !string.Equals(request.Status, "Inactive", StringComparison.OrdinalIgnoreCase);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, seat.Id, cancellationToken))!;
    }

    public async Task<SeatResponse> AssignAsync(
        Guid institutionId,
        Guid branchId,
        Guid seatId,
        AssignSeatRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureBranchAsync(institutionId, branchId, cancellationToken);

        var seat = await _db.Seats
            .FirstOrDefaultAsync(s => s.Id == seatId, cancellationToken)
            ?? throw new InvalidOperationException("Seat not found.");

        var libraryOk = await _db.Libraries.AnyAsync(l =>
            l.Id == seat.LibraryId
            && l.BranchId == branchId
            && l.InstitutionId == institutionId
            && !l.IsDeleted,
            cancellationToken);

        if (!libraryOk)
        {
            throw new InvalidOperationException("Seat not found for this branch.");
        }

        if (!seat.IsActive)
        {
            throw new InvalidOperationException("Cannot assign an inactive seat.");
        }

        Guid memberId;
        if (request.MemberId is Guid mid && mid != Guid.Empty)
        {
            memberId = mid;
        }
        else if (!string.IsNullOrWhiteSpace(request.MembershipNo))
        {
            var membershipNo = request.MembershipNo.Trim();
            memberId = await _db.MemberLibraries.AsNoTracking()
                .Where(ml =>
                    ml.LibraryId == seat.LibraryId
                    && ml.IsCurrent
                    && !ml.IsDeleted
                    && ml.Member.MembershipNo == membershipNo)
                .Select(ml => ml.MemberId)
                .FirstOrDefaultAsync(cancellationToken);

            if (memberId == Guid.Empty)
            {
                throw new InvalidOperationException($"No member with membership no '{membershipNo}' in this library.");
            }
        }
        else
        {
            throw new InvalidOperationException("Member id or membership number is required.");
        }

        var memberLibrary = await _db.MemberLibraries
            .FirstOrDefaultAsync(ml =>
                ml.MemberId == memberId
                && ml.LibraryId == seat.LibraryId
                && ml.IsCurrent
                && !ml.IsDeleted,
                cancellationToken)
            ?? throw new InvalidOperationException("Member is not enrolled in this library.");

        // Free anyone currently on this seat
        var currentOccupants = await _db.MemberLibraries
            .Where(ml => ml.SeatId == seatId && ml.IsCurrent && !ml.IsDeleted && ml.MemberId != memberId)
            .ToListAsync(cancellationToken);
        foreach (var occupant in currentOccupants)
        {
            occupant.SeatId = null;
            occupant.UpdatedAtUtc = DateTime.UtcNow;
            occupant.UpdatedBy = userId;
        }

        // Clear member's previous seat in this library
        memberLibrary.SeatId = seatId;
        memberLibrary.UpdatedAtUtc = DateTime.UtcNow;
        memberLibrary.UpdatedBy = userId;

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, seat.Id, cancellationToken))!;
    }

    public async Task<SeatResponse> ReleaseAsync(
        Guid institutionId,
        Guid branchId,
        Guid seatId,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureBranchAsync(institutionId, branchId, cancellationToken);

        var seat = await _db.Seats
            .FirstOrDefaultAsync(s => s.Id == seatId, cancellationToken)
            ?? throw new InvalidOperationException("Seat not found.");

        var libraryOk = await _db.Libraries.AnyAsync(l =>
            l.Id == seat.LibraryId
            && l.BranchId == branchId
            && l.InstitutionId == institutionId
            && !l.IsDeleted,
            cancellationToken);

        if (!libraryOk)
        {
            throw new InvalidOperationException("Seat not found for this branch.");
        }

        var occupants = await _db.MemberLibraries
            .Where(ml => ml.SeatId == seatId && ml.IsCurrent && !ml.IsDeleted)
            .ToListAsync(cancellationToken);

        if (occupants.Count == 0)
        {
            return (await GetByIdAsync(institutionId, branchId, seat.Id, cancellationToken))!;
        }

        foreach (var occupant in occupants)
        {
            occupant.SeatId = null;
            occupant.UpdatedAtUtc = DateTime.UtcNow;
            occupant.UpdatedBy = userId;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, seat.Id, cancellationToken))!;
    }

    public async Task DeleteAsync(
        Guid institutionId,
        Guid branchId,
        Guid seatId,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureBranchAsync(institutionId, branchId, cancellationToken);

        var seat = await _db.Seats
            .FirstOrDefaultAsync(s => s.Id == seatId, cancellationToken)
            ?? throw new InvalidOperationException("Seat not found.");

        var libraryOk = await _db.Libraries.AnyAsync(l =>
            l.Id == seat.LibraryId
            && l.BranchId == branchId
            && l.InstitutionId == institutionId,
            cancellationToken);

        if (!libraryOk)
        {
            throw new InvalidOperationException("Seat not found for this branch.");
        }

        var assigned = await _db.MemberLibraries.AnyAsync(ml =>
            ml.SeatId == seatId && ml.IsCurrent && !ml.IsDeleted,
            cancellationToken);

        if (assigned)
        {
            throw new InvalidOperationException("Cannot delete a seat that is assigned to a member. Release it first.");
        }

        _db.Seats.Remove(seat);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureBranchAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken)
    {
        var exists = await _db.Branches.AnyAsync(b =>
            b.Id == branchId && b.InstitutionId == institutionId && !b.IsDeleted,
            cancellationToken);

        if (!exists)
        {
            throw new InvalidOperationException("Branch not found.");
        }
    }
}
