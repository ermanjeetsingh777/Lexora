namespace SLMS_API.Application.Contracts.Admin.Requests;

public class AdminUpdateUserRequest
{
    public string? FullName { get; set; }
    public bool? IsActive { get; set; }
    public IReadOnlyCollection<AdminUserInstitutionScopeRequest>? InstitutionScopes { get; set; }
}

