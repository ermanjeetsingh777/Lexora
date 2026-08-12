namespace SLMS_API.Domain.Entities;

public class AuditLog
{
    public long Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
