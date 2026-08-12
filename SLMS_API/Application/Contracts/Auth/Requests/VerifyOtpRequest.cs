using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Auth.Requests;

public class VerifyOtpRequest
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public OtpPurpose Purpose { get; set; } = OtpPurpose.Login;
}
