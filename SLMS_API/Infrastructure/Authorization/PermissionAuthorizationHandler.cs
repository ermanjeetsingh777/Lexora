using Microsoft.AspNetCore.Authorization;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var required = requirement.Permission.ToClaimValue();
        var hasPermission = context.User.Claims
            .Where(x => x.Type == "permission")
            .Any(x => string.Equals(x.Value, required, StringComparison.OrdinalIgnoreCase));

        if (hasPermission || context.User.IsInRole(RoleDefinitions.SuperAdmin))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
