namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class UpdateMemberRequest
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Status { get; set; }
}
