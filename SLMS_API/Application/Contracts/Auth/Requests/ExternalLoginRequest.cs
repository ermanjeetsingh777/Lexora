namespace SLMS_API.Application.Contracts.Auth.Requests;

public class ExternalLoginRequest
{
    public string Provider { get; set; } = string.Empty;
    public string ExternalAccessToken { get; set; } = string.Empty;
    public string? RedirectUri { get; set; }
}
