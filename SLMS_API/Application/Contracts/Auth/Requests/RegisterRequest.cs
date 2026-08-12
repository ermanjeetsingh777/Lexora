using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Auth.Requests;

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
    public string? Name { get; set; }
    public Guid PackageId { get; set; }
    public UserType UserType { get; set; } = UserType.Member;

}
