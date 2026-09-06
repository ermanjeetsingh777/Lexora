namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class CreateMemberRequest
{
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Email { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Gender { get; set; } = "Male";
    public Guid PlanId { get; set; }
    public string Shift { get; set; } = string.Empty;
    /// <summary>Optional custom member ID. Unique within the library. Blank = auto-generate library-wise.</summary>
    public string? MembershipNo { get; set; }
    /// <summary>Optional plan start. Default = today (UTC). End auto = start + plan duration when End omitted.</summary>
    public DateTime? PlanStartDate { get; set; }
    /// <summary>Optional plan end. Must be after start. If omitted, start + plan.DurationInDays.</summary>
    public DateTime? PlanEndDate { get; set; }
    /// <summary>Optional amount actually paid. Default = full plan price.</summary>
    public decimal? PaidAmount { get; set; }
    /// <summary>Optional outstanding due the member still owes (manual). Shortfall without due becomes Adjustment.</summary>
    public decimal? DueAmount { get; set; }
    public bool IsActive { get; set; }
}
