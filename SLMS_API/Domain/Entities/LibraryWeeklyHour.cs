using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class LibraryWeeklyHour : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LibraryId { get; set; }
    public Library Library { get; set; } = default!;
    public string Day { get; set; } = string.Empty;
    public bool Closed { get; set; }
    public TimeOnly? OpenTime { get; set; }
    public TimeOnly? CloseTime { get; set; }
}
