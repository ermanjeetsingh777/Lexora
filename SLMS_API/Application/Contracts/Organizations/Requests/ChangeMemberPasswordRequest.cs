namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class ChangeMemberPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
