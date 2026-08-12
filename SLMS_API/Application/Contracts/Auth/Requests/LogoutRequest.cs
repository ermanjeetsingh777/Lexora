namespace SLMS_API.Application.Contracts.Auth.Requests;

public class LogoutRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}
