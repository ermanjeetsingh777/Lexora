using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities
{
    public class MemberAttendance : AuditableEntity
    {
        public Guid Id { get; set; }

        public Guid MemberId { get; set; }
        public Member Member { get; set; } = default!;
        public DateOnly AttendanceDate { get; set; }
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public int DurationMinutes { get; set; }
        public AttendanceStatus Status { get; set; }
        public Guid InstitutionId { get; set; }
        public Guid BranchId { get; set; }
        public Guid LibraryId { get; set; }      
        public string? Remarks { get; set; } 
        public AttendanceSource Source { get; set; }
        public string? SeatNo { get; set; }
        public string? DeviceId { get; set; }
    }
}
