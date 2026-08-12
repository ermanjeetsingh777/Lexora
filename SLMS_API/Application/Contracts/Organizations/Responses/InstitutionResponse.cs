using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionResponse : AuditableEntity
{
    public Guid Id { get; set; }
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
    public InstitutionStatus Status { get; set; }
}
