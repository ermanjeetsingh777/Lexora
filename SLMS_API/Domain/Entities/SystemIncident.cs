using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class SystemIncident : AuditableEntity
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Severity { get; set; } = "minor";
    public string Status { get; set; } = "Investigating";
    public string AffectedComponents { get; set; } = "[]";
    public DateTime StartedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }

    public ICollection<SystemIncidentUpdate> Updates { get; set; } = new List<SystemIncidentUpdate>();
}
