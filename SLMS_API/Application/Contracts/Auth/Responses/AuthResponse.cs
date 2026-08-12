namespace SLMS_API.Application.Contracts.Auth.Responses;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresAtUtc { get; set; }
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshTokenExpiresAtUtc { get; set; }
    public bool RequiresTwoFactor { get; set; }
    public string? UserId { get; set; }
    public CurrentUserResponse? User { get; set; }
}
