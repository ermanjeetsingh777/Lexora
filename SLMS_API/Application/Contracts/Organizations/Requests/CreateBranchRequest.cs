using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class CreateBranchRequest
{
    public string Name { get; set; } = string.Empty;
    public Guid InstitutionId { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public TimeOnly? ClosesAt { get; set; }
    public TimeOnly? OpenAt { get; set; }
    public int? Capacity { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPrimary { get; set; } = true;
    public bool IsOnboarding { get; set; } = false;
    public InstitutionStatus Status { get; set; } = InstitutionStatus.Active;
}
