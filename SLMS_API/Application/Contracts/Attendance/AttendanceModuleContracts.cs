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

public class AttendanceAnalyticsQuery
{
    public Guid? LibraryId { get; set; }
    public int Days { get; set; } = 14;
}

public class AttendanceTrendDayResponse
{
    public DateOnly Date { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Present { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
}

public class AttendanceShiftMixItemResponse
{
    public string Shift { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class AttendanceHourlyCheckInResponse
{
    public int Hour { get; set; }
    public string Label { get; set; } = string.Empty;
    public int CheckIns { get; set; }
}

public class AttendanceAnalyticsResponse
{
    public int Days { get; set; }
    public DateOnly DateFrom { get; set; }
    public DateOnly DateTo { get; set; }
    public int PresentTotal { get; set; }
    public int LateTotal { get; set; }
    public int AbsentTotal { get; set; }
    public double AttendanceRate { get; set; }
    public int AvgDailyPresent { get; set; }
    public string PeakHourLabel { get; set; } = "—";
    public int PeakHourCheckIns { get; set; }
    public int CurrentlyCheckedIn { get; set; }
    public int AccessibleLibraries { get; set; }
    public IReadOnlyList<AttendanceTrendDayResponse> Trend { get; set; } = [];
    public IReadOnlyList<AttendanceShiftMixItemResponse> ShiftMix { get; set; } = [];
    public IReadOnlyList<AttendanceHourlyCheckInResponse> HourlyToday { get; set; } = [];
}

public class AttendanceLiveEventResponse
{
    public string Id { get; set; } = string.Empty;
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string? SeatNo { get; set; }
    public string? Shift { get; set; }
    public string LibraryName { get; set; } = string.Empty;
    public string Direction { get; set; } = "in";
    public DateTime OccurredAtUtc { get; set; }
}

public class AttendanceCalendarMonthQuery
{
    public Guid? LibraryId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
}

public class AttendanceCalendarDayCellResponse
{
    public DateOnly Date { get; set; }
    public int Present { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
    public int Assigned { get; set; }
    public int IntensityPercent { get; set; }
}

public class AttendanceCalendarMonthResponse
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int EnrolledMembers { get; set; }
    public IReadOnlyList<AttendanceCalendarDayCellResponse> Days { get; set; } = [];
}

public class AttendanceCalendarSummaryQuery
{
    public Guid? LibraryId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
}

public class AttendanceCalendarShiftSummaryResponse
{
    public string Shift { get; set; } = string.Empty;
    public int Assigned { get; set; }
    public int CheckIns { get; set; }
    public int CheckOuts { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
}

public class AttendanceCalendarSummaryResponse
{
    public DateOnly DateFrom { get; set; }
    public DateOnly DateTo { get; set; }
    public int Assigned { get; set; }
    public int CheckIns { get; set; }
    public int CheckOuts { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
    public IReadOnlyList<AttendanceCalendarShiftSummaryResponse> ByShift { get; set; } = [];
}
