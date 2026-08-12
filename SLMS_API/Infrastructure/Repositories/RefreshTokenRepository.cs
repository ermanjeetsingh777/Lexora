using Microsoft.EntityFrameworkCore;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.Repositories.Interfaces;

namespace SLMS_API.Infrastructure.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly ApplicationDbContext _dbContext;

    public RefreshTokenRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default)
    {
        return _dbContext.RefreshTokens.AddAsync(token, cancellationToken).AsTask();
    }

    public Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        return _dbContext.RefreshTokens.FirstOrDefaultAsync(x => x.Token == token, cancellationToken);
    }

    public Task RevokeAsync(RefreshToken token, string? replacedByToken, string reason, CancellationToken cancellationToken = default)
    {
        token.RevokedAtUtc = DateTime.UtcNow;
        token.ReplacedByToken = replacedByToken;
        token.RevokedReason = reason;
        _dbContext.RefreshTokens.Update(token);
        return Task.CompletedTask;
    }

    public async Task RevokeAllForUserAsync(string userId, string reason, CancellationToken cancellationToken = default)
    {
        var tokens = await _dbContext.RefreshTokens
            .Where(x => x.UserId == userId && x.RevokedAtUtc == null && x.ExpiresAtUtc > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
            token.RevokedReason = reason;
        }
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
