using System.Security.Claims;
using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public static class PermissionExtensions
{
    public static IReadOnlyCollection<PermissionKey> GetPermissions(this ClaimsPrincipal user)
    {
        return user.Claims
            .Where(x => x.Type == "permission")
            .Select(x => PermissionKeyExtensions.FromClaimValue(x.Value))
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .Distinct()
            .ToArray();
    }

    public static bool HasPermission(this ClaimsPrincipal user, PermissionKey permission)
    {
        var required = permission.ToClaimValue();
        return user.Claims.Any(x =>
            x.Type == "permission" &&
            string.Equals(x.Value, required, StringComparison.OrdinalIgnoreCase));
    }
}
