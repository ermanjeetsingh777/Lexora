using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class Institution : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Type { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? LogoUrl { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? TimeZone { get; set; }
    public InstitutionStatus Status { get; set; } = InstitutionStatus.Active;
    // Owner
    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
    public ICollection<Library> Libraries { get; set; } = new List<Library>();

    public ICollection<UserInstitution> UserInstitutions { get; set; } = [];
    public ICollection<UserBranch> UserBranches { get; set; } = [];
    public ICollection<UserLibrary> UserLibraries { get; set; } = [];
}
