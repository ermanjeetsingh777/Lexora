using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class LibraryResponse
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? Floor { get; set; }
    public int? Capacity { get; set; }
    public bool IsActive { get; set; }
    public InstitutionStatus Status { get; set; } = InstitutionStatus.Active;
    public DateTime CreatedAtUtc { get; set; }
}
