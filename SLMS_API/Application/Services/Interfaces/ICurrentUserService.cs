using SLMS_API.Application.Contracts.Auth.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? IpAddress { get; }
    bool IsAuthenticated { get; }
    Task<CurrentUserResponse?> GetCurrentUserAsync(CancellationToken cancellationToken = default);
}
