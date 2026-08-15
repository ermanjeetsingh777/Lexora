using SLMS_API.Application.Contracts.Attendance;

namespace SLMS_API.Application.Services.Interfaces;

public interface IAttendanceScannerService
{
    Task<ScannerContextResponse> GetContextAsync(string libraryToken, string? scanUrlBase, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ScannerMemberOption>> SearchMembersAsync(string libraryToken, string? search, CancellationToken cancellationToken = default);
    Task<ScannerMemberStatusResponse> GetMemberStatusAsync(string libraryToken, Guid memberId, CancellationToken cancellationToken = default);
    Task<ScannerAttendanceResultResponse> RecordAsync(ScannerAttendanceRequest request, string? userId, CancellationToken cancellationToken = default);
    Task<ScannerQrCodeResponse> GetQrCodeAsync(Guid libraryId, string? scanUrlBase, CancellationToken cancellationToken = default);
}
