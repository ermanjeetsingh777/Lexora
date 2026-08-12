using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Organizations.Requests
{

    public class CheckInRequest
    {
        public Guid MemberId { get; set; }
        public string? SeatNumber { get; set; }
        public string? DeviceId { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateAttendanceRequest
    {
        public Guid MemberId { get; set; }
        public DateOnly AttendanceDate { get; set; }
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public AttendanceStatus Status { get; set; }
        public AttendanceSource Source { get; set; }
        public string? SeatNumber { get; set; }
        public string? DeviceId { get; set; }
        public string? Remarks { get; set; }
    }

    public class UpdateAttendanceRequest
    {
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public AttendanceStatus Status { get; set; }
        public string? SeatNumber { get; set; }
        public string? DeviceId { get; set; }
        public string? Remarks { get; set; }
        public bool IsActive { get; set; }
    }

    public class AttendanceResponse
    {
        public Guid Id { get; set; }
        public Guid MemberId { get; set; }
        public DateOnly AttendanceDate { get; set; }
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public DateTime? CheckInAtUtc { get; set; }
        public DateTime? CheckOutAtUtc { get; set; }
        public int DurationMinutes { get; set; }
        public AttendanceStatus Status { get; set; }
        public AttendanceSource Source { get; set; }
        public string? SeatNo { get; set; }
        public string? Remarks { get; set; }
        public bool IsActive { get; set; }
        public bool IsWeekend { get; set; }
        public bool IsHoliday { get; set; }
        public string? HolidayName { get; set; }
    }

    public class AttendanceHistoryResponse
    {
        public Guid Id { get; set; }
        public Guid MemberId { get; set; }
        public DateOnly AttendanceDate { get; set; }
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public int DurationMinutes { get; set; }
        public AttendanceStatus Status { get; set; }
    }

    public class AttendanceStatisticsResponse
    {
        public int TotalDays { get; set; }
        public int PresentDays { get; set; }
        public int AbsentDays { get; set; }
        public int LeaveDays { get; set; }
        public int LateDays { get; set; }
        public double AttendancePercentage { get; set; }
        public int TotalStudyMinutes { get; set; }
        public int CurrentStreak { get; set; }
        public int LongestStreak { get; set; }
    }

}
