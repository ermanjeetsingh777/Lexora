using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.Repositories.Interfaces;

namespace SLMS_API.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly ApplicationDbContext _dbContext;

    public AuditLogRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(AuditLog log, CancellationToken cancellationToken = default)
    {
        return _dbContext.AuditLogs.AddAsync(log, cancellationToken).AsTask();
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
