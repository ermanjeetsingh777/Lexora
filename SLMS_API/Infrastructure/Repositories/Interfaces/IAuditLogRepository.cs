using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Repositories.Interfaces;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
