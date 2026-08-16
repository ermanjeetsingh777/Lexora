using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Organizations.Responses
{
    public class MemberListResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Avatar { get; set; }
        public int AvatarHue { get; set; }
        public bool HasPhoto { get; set; }
        public string Institution { get; set; } = string.Empty;
        public string Branch { get; set; } = string.Empty;
        public string Library { get; set; } = string.Empty;
        public string? Membership { get; set; }
        public string? Plan { get; set; }
        public string? PlanId { get; set; }
        public string? Shift { get; set; }
        public string? Seat { get; set; }
        public string? SeatNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public MemberPlanStatus PlanStatus { get; set; }
        public DateOnly JoinDate { get; set; }
        public DateOnly? LastVisit { get; set; }
        public int Visits30d { get; set; }
        public decimal AttendanceRate { get; set; }
        public decimal FeesOwed { get; set; }
        public DateOnly? PlanStartDate { get; set; }
        public DateOnly? PlanEndDate { get; set; }
        public int PlanDurationInDays { get; set; }
        public int DaysRemaining { get; set; }
    }

    public class MembershipSummaryResponse
    {
        public int TotalMembers { get; set; }
        public int ActiveCount { get; set; }
        public int ExpiredCount { get; set; }
        public int ExpiringSoonCount { get; set; }
    }

}
