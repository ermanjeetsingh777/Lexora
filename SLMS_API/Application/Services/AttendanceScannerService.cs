using Microsoft.EntityFrameworkCore;
using QRCoder;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class AttendanceScannerService : IAttendanceScannerService
{
    private readonly ApplicationDbContext _context;
    private readonly IAttendanceService _attendanceService;
    private readonly ILogger<AttendanceScannerService> _logger;

    public AttendanceScannerService(
        ApplicationDbContext context,
        IAttendanceService attendanceService,
        ILogger<AttendanceScannerService> logger)
    {
        _context = context;
        _attendanceService = attendanceService;
        _logger = logger;
    }

    public async Task<ScannerContextResponse> GetContextAsync(
        string libraryToken,
        string? scanUrlBase,
        CancellationToken cancellationToken = default)
    {
        var library = await ResolveLibraryAsync(libraryToken, cancellationToken);
        return await BuildContextAsync(library, scanUrlBase, cancellationToken);
    }

    public async Task<IReadOnlyList<ScannerMemberOption>> SearchMembersAsync(
        string libraryToken,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var library = await ResolveLibraryAsync(libraryToken, cancellationToken);

        var query = _context.Members
            .AsNoTracking()
            .Where(m => m.IsActive && !m.IsDeleted)
            .Where(m => m.MemberLibraries.Any(ml => ml.LibraryId == library.Id && ml.IsActive && !ml.IsDeleted));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(m =>
                m.FullName.ToLower().Contains(term) ||
                m.MembershipNo.ToLower().Contains(term) ||
                m.PhoneNumber.Contains(term) ||
                m.Id.ToString().ToLower().Contains(term));
        }

        return await query
            .OrderBy(m => m.FullName)
            .Take(50)
            .Select(m => new ScannerMemberOption
            {
                Id = m.Id,
                MembershipNo = m.MembershipNo,
                FullName = m.FullName,
                Shift = m.Shift,
                SeatNumber = m.MemberLibraries
                    .Where(ml => ml.LibraryId == library.Id && ml.IsActive)
                    .Select(ml => ml.Seat != null ? ml.Seat.SeatNumber : null)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<ScannerMemberStatusResponse> GetMemberStatusAsync(
        string libraryToken,
        Guid memberId,
        CancellationToken cancellationToken = default)
    {
        var library = await ResolveLibraryAsync(libraryToken, cancellationToken);
        await EnsureMemberInLibraryAsync(memberId, library.Id, cancellationToken);

        var member = await _context.Members
            .AsNoTracking()
            .FirstAsync(m => m.Id == memberId, cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var attendance = await _context.MemberAttendances
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MemberId == memberId && x.AttendanceDate == today && x.IsActive, cancellationToken);

        var isCheckedIn = attendance?.CheckInTime.HasValue == true;
        var isCheckedOut = attendance?.CheckOutTime.HasValue == true;

        return new ScannerMemberStatusResponse
        {
            MemberId = member.Id,
            MembershipNo = member.MembershipNo,
            FullName = member.FullName,
            IsCheckedInToday = isCheckedIn,
            IsCheckedOutToday = isCheckedOut,
            Status = attendance?.Status,
            CheckInTime = attendance?.CheckInTime,
            CheckOutTime = attendance?.CheckOutTime,
            CheckInAtUtc = attendance?.CheckInTime.HasValue == true
                ? attendance!.AttendanceDate.ToDateTime(attendance.CheckInTime!.Value, DateTimeKind.Utc)
                : null,
            CheckOutAtUtc = attendance?.CheckOutTime.HasValue == true
                ? attendance!.AttendanceDate.ToDateTime(attendance.CheckOutTime!.Value, DateTimeKind.Utc)
                : null,
            SeatNumber = attendance?.SeatNo,
            SuggestedAction = ResolveSuggestedAction(isCheckedIn, isCheckedOut),
        };
    }

    public async Task<IReadOnlyList<AttendanceSeatOptionResponse>> GetLibrarySeatsAsync(
        string libraryToken,
        CancellationToken cancellationToken = default)
    {
        var library = await ResolveLibraryAsync(libraryToken, cancellationToken);
        return await AttendanceSeatHelper.GetSeatOptionsAsync(_context, library.Id, cancellationToken);
    }

    public Task<IReadOnlyList<AttendanceSeatOptionResponse>> GetLibrarySeatsByLibraryIdAsync(
        Guid libraryId,
        CancellationToken cancellationToken = default) =>
        AttendanceSeatHelper.GetSeatOptionsAsync(_context, libraryId, cancellationToken);

    public async Task<ScannerAttendanceResultResponse> RecordAsync(
        ScannerAttendanceRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        var library = await ResolveLibraryAsync(request.LibraryToken, cancellationToken);
        await EnsureMemberInLibraryAsync(request.MemberId, library.Id, cancellationToken);
        await EnsureDeviceAllowsMemberAsync(request.DeviceId, request.MemberId, cancellationToken);

        var member = await _context.Members
            .AsNoTracking()
            .FirstAsync(m => m.Id == request.MemberId, cancellationToken);

        var status = await GetMemberStatusAsync(request.LibraryToken, request.MemberId, cancellationToken);
        var action = NormalizeAction(request.Action, status.SuggestedAction);

        if (action == "done")
        {
            throw new InvalidOperationException("Member has already completed attendance for today.");
        }

        Contracts.Organizations.Requests.AttendanceResponse attendance;
        string message;

        if (action == "check-in")
        {
            if (status.IsCheckedInToday && !status.IsCheckedOutToday)
            {
                throw new InvalidOperationException("Member is already checked in.");
            }

            if (status.IsCheckedOutToday)
            {
                throw new InvalidOperationException("Member has already completed attendance for today.");
            }

            attendance = await _attendanceService.CheckInAsync(
                request.MemberId,
                new CheckInRequest
                {
                    MemberId = request.MemberId,
                    SeatNumber = request.SeatNumber,
                    DeviceId = request.DeviceId ?? $"qr:{library.Id}",
                    Remarks = request.Remarks,
                    Source = AttendanceSource.QRCode,
                },
                userId ?? "scanner",
                cancellationToken);

            message = $"{member.FullName} checked in successfully.";
        }
        else if (action == "check-out")
        {
            if (!status.IsCheckedInToday)
            {
                throw new InvalidOperationException("Member has not checked in today.");
            }

            if (status.IsCheckedOutToday)
            {
                throw new InvalidOperationException("Member has already checked out.");
            }

            attendance = await _attendanceService.CheckOutAsync(
                request.MemberId,
                new CheckOutRequest
                {
                    MemberId = request.MemberId,
                    SeatNumber = request.SeatNumber,
                    DeviceId = request.DeviceId ?? $"qr:{library.Id}",
                    Remarks = request.Remarks,
                },
                userId ?? "scanner",
                cancellationToken);

            message = $"{member.FullName} checked out successfully.";
        }
        else
        {
            throw new InvalidOperationException("Invalid attendance action.");
        }

        return new ScannerAttendanceResultResponse
        {
            Action = action,
            Message = message,
            Member = new ScannerMemberOption
            {
                Id = member.Id,
                MembershipNo = member.MembershipNo,
                FullName = member.FullName,
                Shift = member.Shift,
            },
            Attendance = attendance,
        };
    }

    public async Task<ScannerQrCodeResponse> GetQrCodeAsync(
        Guid libraryId,
        string? scanUrlBase,
        CancellationToken cancellationToken = default)
    {
        var library = await _context.Libraries
            .AsNoTracking()
            .Include(l => l.Branch)
            .Include(l => l.Institution)
            .FirstOrDefaultAsync(l => l.Id == libraryId && !l.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Library not found.");

        if (string.IsNullOrWhiteSpace(library.AttendanceQrToken))
        {
            throw new InvalidOperationException("Library attendance QR token is not configured.");
        }

        var scanUrl = BuildScanUrl(scanUrlBase, library.AttendanceQrToken);
        return new ScannerQrCodeResponse
        {
            LibraryId = library.Id,
            LibraryName = library.Name,
            Token = library.AttendanceQrToken,
            ScanUrl = scanUrl,
            QrCodeBase64 = GenerateQrCodeBase64(scanUrl),
        };
    }

    public async Task<MemberQrCodeResponse> GetMemberQrCodeAsync(
        Guid memberId,
        string? scanUrlBase,
        CancellationToken cancellationToken = default)
    {
        var member = await _context.Members
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == memberId && !m.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Member not found.");

        if (string.IsNullOrWhiteSpace(member.AttendanceQrToken))
        {
            var tracked = await _context.Members.FirstAsync(m => m.Id == memberId, cancellationToken);
            tracked.AttendanceQrToken = Guid.NewGuid().ToString("N");
            await _context.SaveChangesAsync(cancellationToken);
            member.AttendanceQrToken = tracked.AttendanceQrToken;
        }

        var scanUrl = BuildMemberScanUrl(scanUrlBase, member.AttendanceQrToken);
        return new MemberQrCodeResponse
        {
            MemberId = member.Id,
            MembershipNo = member.MembershipNo,
            FullName = member.FullName,
            Token = member.AttendanceQrToken,
            ScanUrl = scanUrl,
            QrCodeBase64 = GenerateQrCodeBase64(scanUrl),
        };
    }

    public async Task<MemberScannerContextResponse> GetMemberContextAsync(
        string memberToken,
        string? scanUrlBase,
        string? deviceId = null,
        CancellationToken cancellationToken = default)
    {
        var (member, library) = await ResolveMemberWithLibraryAsync(memberToken, cancellationToken);
        await EnsureMemberTokenAsync(member, cancellationToken);
        await EnsureDeviceAllowsMemberAsync(deviceId, member.Id, cancellationToken);

        return new MemberScannerContextResponse
        {
            MemberId = member.Id,
            MembershipNo = member.MembershipNo,
            FullName = member.FullName,
            Token = member.AttendanceQrToken!,
            ScanUrl = BuildMemberScanUrl(scanUrlBase, member.AttendanceQrToken!),
            LibraryId = library.Id,
            LibraryName = library.Name,
            BranchName = library.Branch?.Name ?? string.Empty,
            InstitutionName = library.Institution?.Name ?? string.Empty,
        };
    }

    public async Task<ScannerMemberStatusResponse> GetMemberStatusByTokenAsync(
        string memberToken,
        CancellationToken cancellationToken = default)
    {
        var (member, library) = await ResolveMemberWithLibraryAsync(memberToken, cancellationToken);
        return await GetMemberStatusAsync(library.AttendanceQrToken!, member.Id, cancellationToken);
    }

    public async Task<ScannerAttendanceResultResponse> RecordByMemberTokenAsync(
        MemberScannerRecordRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        var (member, library) = await ResolveMemberWithLibraryAsync(request.MemberToken, cancellationToken);

        if (string.IsNullOrWhiteSpace(library.AttendanceQrToken))
        {
            throw new InvalidOperationException("Library attendance QR is not configured.");
        }

        return await RecordAsync(new ScannerAttendanceRequest
        {
            LibraryToken = library.AttendanceQrToken,
            MemberId = member.Id,
            Action = request.Action,
            SeatNumber = request.SeatNumber,
            DeviceId = request.DeviceId ?? $"member-qr:{member.Id}",
            Remarks = request.Remarks,
        }, userId ?? "kiosk", cancellationToken);
    }

    private async Task EnsureDeviceAllowsMemberAsync(
        string? deviceId,
        Guid memberId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            return;
        }

        if (deviceId.StartsWith("staff:", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var otherMemberId = await _context.MemberAttendances
            .AsNoTracking()
            .Where(a =>
                a.AttendanceDate == today &&
                a.IsActive &&
                a.Source == AttendanceSource.QRCode &&
                a.DeviceId == deviceId &&
                a.MemberId != memberId)
            .Select(a => a.MemberId)
            .FirstOrDefaultAsync(cancellationToken);

        if (otherMemberId == Guid.Empty)
        {
            return;
        }

        var otherMember = await _context.Members
            .AsNoTracking()
            .Where(m => m.Id == otherMemberId)
            .Select(m => new { m.FullName, m.MembershipNo })
            .FirstAsync(cancellationToken);

        throw new InvalidOperationException(
            $"This device is already used for {otherMember.FullName}'s attendance today. One device can mark attendance for only one member.");
    }

    private async Task<(Domain.Entities.Member Member, Library Library)> ResolveMemberWithLibraryAsync(
        string memberToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(memberToken))
        {
            throw new InvalidOperationException("Member attendance QR token is required.");
        }

        var token = memberToken.Trim();
        var member = await _context.Members
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.AttendanceQrToken == token && m.IsActive && !m.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Invalid or inactive member QR code.");

        var memberLibrary = await _context.MemberLibraries
            .AsNoTracking()
            .Include(ml => ml.Library)
                .ThenInclude(l => l.Branch)
            .Include(ml => ml.Library)
                .ThenInclude(l => l.Institution)
            .Where(ml => ml.MemberId == member.Id && ml.IsActive && !ml.IsDeleted)
            .OrderByDescending(ml => ml.IsCurrent)
            .ThenByDescending(ml => ml.JoinedOn)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("Member is not assigned to any library.");

        var library = memberLibrary.Library
            ?? throw new InvalidOperationException("Member library could not be resolved.");

        if (!library.IsActive || library.IsDeleted)
        {
            throw new InvalidOperationException("Member library is inactive.");
        }

        return (member, library);
    }

    private async Task EnsureMemberTokenAsync(Domain.Entities.Member member, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(member.AttendanceQrToken))
        {
            return;
        }

        var tracked = await _context.Members.FirstAsync(m => m.Id == member.Id, cancellationToken);
        tracked.AttendanceQrToken = Guid.NewGuid().ToString("N");
        await _context.SaveChangesAsync(cancellationToken);
        member.AttendanceQrToken = tracked.AttendanceQrToken;
    }

    private async Task<Library> ResolveLibraryAsync(string libraryToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(libraryToken))
        {
            throw new InvalidOperationException("Attendance QR token is required.");
        }

        var token = libraryToken.Trim();
        var library = await _context.Libraries
            .Include(l => l.Branch)
            .Include(l => l.Institution)
            .FirstOrDefaultAsync(l => l.AttendanceQrToken == token && !l.IsDeleted && l.IsActive, cancellationToken);

        if (library is null)
        {
            throw new InvalidOperationException("Invalid or inactive attendance QR code.");
        }

        return library;
    }

    private async Task EnsureMemberInLibraryAsync(Guid memberId, Guid libraryId, CancellationToken cancellationToken)
    {
        var belongs = await _context.MemberLibraries
            .AsNoTracking()
            .AnyAsync(ml => ml.MemberId == memberId && ml.LibraryId == libraryId && ml.IsActive && !ml.IsDeleted, cancellationToken);

        if (!belongs)
        {
            throw new InvalidOperationException("Member is not assigned to this library.");
        }
    }

    private async Task<ScannerContextResponse> BuildContextAsync(
        Library library,
        string? scanUrlBase,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(library.AttendanceQrToken))
        {
            var tracked = await _context.Libraries.FirstAsync(l => l.Id == library.Id, cancellationToken);
            tracked.AttendanceQrToken = Guid.NewGuid().ToString("N");
            await _context.SaveChangesAsync(cancellationToken);
            library.AttendanceQrToken = tracked.AttendanceQrToken;
        }

        return new ScannerContextResponse
        {
            LibraryId = library.Id,
            LibraryName = library.Name,
            BranchId = library.BranchId,
            BranchName = library.Branch?.Name ?? string.Empty,
            InstitutionId = library.InstitutionId,
            InstitutionName = library.Institution?.Name ?? string.Empty,
            Token = library.AttendanceQrToken,
            ScanUrl = BuildScanUrl(scanUrlBase, library.AttendanceQrToken),
        };
    }

    private static string BuildScanUrl(string? scanUrlBase, string token)
    {
        var baseUrl = string.IsNullOrWhiteSpace(scanUrlBase)
            ? "/kiosk/attendance/library"
            : scanUrlBase.TrimEnd('/');

        return baseUrl.Contains('?', StringComparison.Ordinal)
            ? $"{baseUrl}&token={token}"
            : $"{baseUrl}?token={token}";
    }

    private static string BuildMemberScanUrl(string? scanUrlBase, string token)
    {
        var baseUrl = string.IsNullOrWhiteSpace(scanUrlBase)
            ? "/kiosk/attendance/member"
            : scanUrlBase.TrimEnd('/');

        return baseUrl.Contains('?', StringComparison.Ordinal)
            ? $"{baseUrl}&token={token}"
            : $"{baseUrl}?token={token}";
    }

    private static string GenerateQrCodeBase64(string content)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        var qr = new PngByteQRCode(data);
        var bytes = qr.GetGraphic(8);
        return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
    }

    private static string ResolveSuggestedAction(bool isCheckedIn, bool isCheckedOut)
    {
        if (!isCheckedIn) return "check-in";
        if (!isCheckedOut) return "check-out";
        return "done";
    }

    private static string NormalizeAction(string requested, string suggested)
    {
        var action = (requested ?? "auto").Trim().ToLowerInvariant();
        if (action is "auto" or "")
        {
            return suggested == "done" ? "done" : suggested;
        }

        return action;
    }
}
