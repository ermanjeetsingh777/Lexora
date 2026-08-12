using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Admin.Requests;

public class AdminAssignRolePermissionsRequest
{
    public IReadOnlyCollection<PermissionKey> Permissions { get; set; } = [];
}
