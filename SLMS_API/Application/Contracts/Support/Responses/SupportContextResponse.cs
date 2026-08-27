using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Support.Responses;

public class SupportInstitutionOptionResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class SupportContextResponse
{
    public bool IsSuperAdmin { get; set; }
    public bool IsOrgStaff { get; set; }
    public string ScopeLabel { get; set; } = string.Empty;
    public IReadOnlyCollection<SupportInstitutionOptionResponse> Institutions { get; set; } = Array.Empty<SupportInstitutionOptionResponse>();
    public IReadOnlyCollection<TicketCategory> CreatableCategories { get; set; } = Array.Empty<TicketCategory>();
}
