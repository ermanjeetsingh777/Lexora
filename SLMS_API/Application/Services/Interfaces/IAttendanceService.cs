using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Organizations.Requests;using SLMS_API.Application.Contracts.Organizations;
using SLMS_API.Application.Contracts.Common;

namespace SLMS_API.Application.Services.Interfaces;

public interface IAttendanceService
{
    Task<IReadOnlyCollection<AttendanceResponse>> GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken = default);
    Task<AttendanceResponse> CheckInAsync(Guid memberId, CheckInRequest request, string userId, CancellationToken cancellationToken = default);

    Task<AttendanceResponse> CheckOutAsync( Guid memberId, CheckOutRequest request, string userId, CancellationToken cancellationToken = default);

    Task<AttendanceResponse?> GetTodayAttendanceAsync( Guid memberId, CancellationToken cancellationToken = default);

    Task<PagedResult<AttendanceHistoryResponse>> GetHistoryAsync( Guid memberId, int page, int pageSize, CancellationToken cancellationToken);

    Task<AttendanceStatisticsResponse> GetStatisticsAsync( Guid memberId, CancellationToken cancellationToken);

    Task<AttendanceResponse> CreateAsync(CreateAttendanceRequest request, string userId, CancellationToken cancellationToken);

    Task<AttendanceResponse> UpdateAsync(Guid attendanceId, UpdateAttendanceRequest request, string userId, CancellationToken cancellationToken);

    Task DeleteAsync( Guid attendanceId, CancellationToken cancellationToken);

    Task<IReadOnlyList<AttendanceHistoryResponse>> GetMonthlyAttendanceAsync(Guid memberId, int month, int year, CancellationToken cancellationToken);

    Task<IReadOnlyList<AttendanceResponse>> GetAttendanceCalendarAsync(Guid memberId, int month, int year, CancellationToken cancellationToken);

    Task<bool> IsCheckedInAsync(Guid memberId, CancellationToken cancellationToken);

    Task<int> GetCurrentSessionMinutesAsync(Guid memberId, CancellationToken cancellationToken);

    Task<IReadOnlyList<AttendanceSeatOptionResponse>> GetLibrarySeatsAsync(Guid libraryId, CancellationToken cancellationToken = default);

    Task<AttendanceModuleSummaryResponse> GetModuleSummaryAsync(
        AttendanceModuleQuery query,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<PagedResult<AttendanceRecordListItemResponse>> GetModuleRecordsAsync(
        AttendanceModuleQuery query,
        Guid userId,
        CancellationToken cancellationToken = default);
}
