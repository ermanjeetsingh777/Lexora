namespace SLMS_API.Application.Contracts.Admin.Responses;

public class AdminRoleResponse
{
    public string Id { get; set; } = string.Empty;
    public string? Name { get; set; }
    public bool IsSystem { get; set; }
    public IReadOnlyCollection<Guid> InstitutionIds { get; set; } = [];
}

