using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Auth.Requests;

public class SendOtpRequest
{
    public string Email { get; set; } = string.Empty;
    public OtpPurpose Purpose { get; set; } = OtpPurpose.Login;
}
