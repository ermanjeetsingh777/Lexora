using Microsoft.EntityFrameworkCore;
using QRCoder;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Organizations.Requests;
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
            SuggestedAction = ResolveSuggestedAction(isCheckedIn, isCheckedOut),
        };
    }

    public async Task<ScannerAttendanceResultResponse> RecordAsync(
        ScannerAttendanceRequest request,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        var library = await ResolveLibraryAsync(request.LibraryToken, cancellationToken);
        await EnsureMemberInLibraryAsync(request.MemberId, library.Id, cancellationToken);

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
            ? "/attendance/scanner"
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
