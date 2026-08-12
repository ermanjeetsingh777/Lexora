using Microsoft.AspNetCore.Authorization;
using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(PermissionKey permission)
    {
        Permission = permission;
    }

    public PermissionKey Permission { get; }
}
