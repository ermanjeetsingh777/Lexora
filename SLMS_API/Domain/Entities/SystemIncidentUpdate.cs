using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class SystemIncidentUpdate : AuditableEntity
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public SystemIncident Incident { get; set; } = default!;
    public string Phase { get; set; } = "Investigating";
    public string Body { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
}
