namespace SLMS_API.Application.Contracts.Admin.Requests;

public class AdminCreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public IReadOnlyCollection<Guid>? InstitutionIds { get; set; }
    public string? CloneFromRoleId { get; set; }
    public IReadOnlyCollection<int>? ClonePermissionKeys { get; set; }
}

