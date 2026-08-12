using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Repositories.Interfaces;

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default);
    Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task RevokeAsync(RefreshToken token, string? replacedByToken, string reason, CancellationToken cancellationToken = default);
    Task RevokeAllForUserAsync(string userId, string reason, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
