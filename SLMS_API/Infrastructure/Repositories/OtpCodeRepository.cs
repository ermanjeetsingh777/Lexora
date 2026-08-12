using Microsoft.EntityFrameworkCore;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.Repositories.Interfaces;

namespace SLMS_API.Infrastructure.Repositories;

public class OtpCodeRepository : IOtpCodeRepository
{
    private readonly ApplicationDbContext _dbContext;

    public OtpCodeRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(OtpCode otpCode, CancellationToken cancellationToken = default)
    {
        return _dbContext.OtpCodes.AddAsync(otpCode, cancellationToken).AsTask();
    }

    public Task<OtpCode?> GetLatestValidAsync(string userId, OtpPurpose purpose, CancellationToken cancellationToken = default)
    {
        return _dbContext.OtpCodes
            .Where(x => x.UserId == userId
                        && x.Purpose == purpose
                        && !x.IsUsed
                        && x.ExpiresAtUtc > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task InvalidateAllForUserAsync(string userId, OtpPurpose purpose, CancellationToken cancellationToken = default)
    {
        var codes = await _dbContext.OtpCodes
            .Where(x => x.UserId == userId && x.Purpose == purpose && !x.IsUsed)
            .ToListAsync(cancellationToken);

        foreach (var code in codes)
        {
            code.IsUsed = true;
        }
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
