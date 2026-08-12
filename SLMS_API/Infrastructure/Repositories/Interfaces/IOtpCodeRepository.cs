using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Repositories.Interfaces;

public interface IOtpCodeRepository
{
    Task AddAsync(OtpCode otpCode, CancellationToken cancellationToken = default);
    Task<OtpCode?> GetLatestValidAsync(string userId, OtpPurpose purpose, CancellationToken cancellationToken = default);
    Task InvalidateAllForUserAsync(string userId, OtpPurpose purpose, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
