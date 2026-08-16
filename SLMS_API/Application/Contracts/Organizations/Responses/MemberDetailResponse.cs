using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Organizations.Responses
{
    public class MemberDetailResponse
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }

        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }

        public string? MembershipNo { get; set; }

        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
        public MemberPlanStatus PlanStatus { get; set; }

        // Institution
        public Guid InstitutionId { get; set; }
        public string Institution { get; set; } = string.Empty;

        // Branch
        public Guid BranchId { get; set; }
        public string Branch { get; set; } = string.Empty;

        // Library
        public Guid LibraryId { get; set; }
        public string Library { get; set; } = string.Empty;

        // Plan
        public Guid? PlanId { get; set; }
        public string? Plan { get; set; }
        public decimal? PlanPrice { get; set; }

        public DateOnly? PlanStartDate { get; set; }
        public DateOnly? PlanEndDate { get; set; }
        public int PlanDurationInDays { get; set; }

        // Shift
        public string? Shift { get; set; }

        // Seat
        public Guid? SeatId { get; set; }
        public string? SeatNumber { get; set; }

        // Attendance
        public DateOnly? LastVisit { get; set; }
        public int Visits30d { get; set; }
        public decimal AttendanceRate { get; set; }
        public int PresentDays { get; set; }
        public int TotalSessions { get; set; }
        public string AttendanceSummary => $"{PresentDays} of {TotalSessions} sessions attended";

        // Fees
        public decimal FeesOwed { get; set; }
        public DateOnly? DueDate { get; set; }
        public DateOnly? LastPaymentDate { get; set; }
        public int InvoiceCount { get; set; }
        public DateTime? JoinedOn { get; set; }
        public DateTime CreatedAtUtc { get; set; }

        public bool HasPhoto { get; set; }
        public bool HasAadhaar { get; set; }

        // Guardian / Emergency Contacts
        public IReadOnlyCollection<MemberContactResponse> Contacts { get; set; } =  new List<MemberContactResponse>();
        public IReadOnlyCollection<MemberPlanResponse> Plans { get; set; } = new List<MemberPlanResponse>();
        public IReadOnlyCollection<AttendanceResponse> Attendance { get; set; } = new List<AttendanceResponse>();
        public AttendanceResponse? TodayAttendance { get; set; }
    }
}
