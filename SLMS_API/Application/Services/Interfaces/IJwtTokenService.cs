using SLMS_API.Application.Contracts.Auth;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Application.Services.Interfaces;

public interface IJwtTokenService
{
    Task<TokenResult> GenerateTokensAsync(
        ApplicationUser user,
        IReadOnlyCollection<string> roles,
        IReadOnlyCollection<PermissionKey> permissions,
        CancellationToken cancellationToken = default);
}
