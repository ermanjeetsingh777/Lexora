namespace SLMS_API.Application.Contracts.Admin.Responses;

public class AdminUserAccessScopeResponse
{
    public Guid? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public IReadOnlyCollection<AdminUserInstitutionScopeResponse> InstitutionScopes { get; set; } = [];
    public IReadOnlyCollection<AdminUserScopeItemResponse> Branches { get; set; } = [];
    public IReadOnlyCollection<AdminUserScopeItemResponse> Libraries { get; set; } = [];
    public string Summary { get; set; } = string.Empty;
}

public class AdminUserInstitutionScopeResponse
{
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public IReadOnlyCollection<AdminUserScopeItemResponse> Branches { get; set; } = [];
    public IReadOnlyCollection<AdminUserScopeItemResponse> Libraries { get; set; } = [];
}

public class AdminUserScopeItemResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
