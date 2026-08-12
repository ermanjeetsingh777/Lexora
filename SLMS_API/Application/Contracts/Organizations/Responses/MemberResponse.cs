namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class MemberResponse
{
    public Guid Id { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
}
