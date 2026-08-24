namespace SLMS_API.Application.Contracts.Admin.Requests;

public class AdminChangeUserPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
