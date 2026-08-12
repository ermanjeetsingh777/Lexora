namespace SLMS_API.Application.Contracts.Auth.Requests;

public class UpdateProfileRequest
{
    public string? FullName { get; set; }
    public string? UserName { get; set; }
    public string? Email { get; set; }
}
