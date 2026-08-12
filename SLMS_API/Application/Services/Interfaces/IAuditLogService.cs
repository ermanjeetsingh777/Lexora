namespace SLMS_API.Application.Services.Interfaces;

public interface IAuditLogService
{
    Task WriteAsync(
        string eventType,
        string? userId,
        string? details,
        string? ipAddress,
        CancellationToken cancellationToken = default);
}
