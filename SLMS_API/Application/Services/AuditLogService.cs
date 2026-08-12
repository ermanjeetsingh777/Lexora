using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Repositories.Interfaces;

namespace SLMS_API.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogService(IAuditLogRepository auditLogRepository)
    {
        _auditLogRepository = auditLogRepository;
    }

    public async Task WriteAsync(
        string eventType,
        string? userId,
        string? details,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        await _auditLogRepository.AddAsync(new AuditLog
        {
            EventType = eventType,
            UserId = userId,
            Details = details,
            IpAddress = ipAddress
        }, cancellationToken);

        await _auditLogRepository.SaveChangesAsync(cancellationToken);
    }
}
