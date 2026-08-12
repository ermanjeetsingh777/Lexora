namespace SLMS_API.Application.Contracts.Admin.Responses;

public class AdminRolePermissionsResponse
{
    public string RoleId { get; set; } = string.Empty;
    public string? RoleName { get; set; }
    public IReadOnlyCollection<PermissionResponse> Permissions { get; set; } = [];
}
