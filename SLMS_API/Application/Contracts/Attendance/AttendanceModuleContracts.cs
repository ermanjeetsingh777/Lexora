using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Attendance;

public class AttendanceModuleQuery
{
    public Guid? LibraryId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public string? Search { get; set; }
    public AttendanceStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class AttendanceModuleSummaryResponse
{
    public int TotalRecords { get; set; }
    public int UniqueMembers { get; set; }
    public int CurrentlyCheckedIn { get; set; }
    public int CheckedOut { get; set; }
    public int AccessibleLibraries { get; set; }
    public DateOnly DateFrom { get; set; }
    public DateOnly DateTo { get; set; }
}

public class AttendanceRecordListItemResponse
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string MembershipNo { get; set; } = string.Empty;
    public string? Shift { get; set; }
    public Guid LibraryId { get; set; }
    public string LibraryName { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public DateOnly AttendanceDate { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public DateTime? CheckInAtUtc { get; set; }
    public DateTime? CheckOutAtUtc { get; set; }
    public int DurationMinutes { get; set; }
    public AttendanceStatus Status { get; set; }
    public AttendanceSource Source { get; set; }
    public string? SeatNo { get; set; }
}
