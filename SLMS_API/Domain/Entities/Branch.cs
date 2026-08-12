using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class Branch : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();  
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public TimeOnly? OperatingHoursStart { get; set; }
    public TimeOnly? OperatingHoursEnd { get; set; }
    public InstitutionStatus Status { get; set; } = InstitutionStatus.Active;
    public int? Capacity { get; set; }
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = default!;
    public ICollection<Library> Libraries { get; set; } = [];

    public ICollection<UserBranch> UserBranches { get; set; } = [];
    public ICollection<UserLibrary> UserLibraries { get; set; } = [];
}
