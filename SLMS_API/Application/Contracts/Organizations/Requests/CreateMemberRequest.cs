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
    public bool IsActive { get; set; }
}
