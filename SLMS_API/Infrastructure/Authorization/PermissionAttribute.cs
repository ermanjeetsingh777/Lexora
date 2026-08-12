using Microsoft.AspNetCore.Authorization;
using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public class PermissionAttribute : AuthorizeAttribute
{
    public PermissionAttribute(PermissionKey permission)
    {
        Policy = $"{PermissionPolicyProvider.PolicyPrefix}{permission}";
    }
}
