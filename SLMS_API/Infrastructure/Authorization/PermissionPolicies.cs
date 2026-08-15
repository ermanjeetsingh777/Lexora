using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public static class PermissionPolicies
{
    public const string Users = $"{PermissionPolicyProvider.PolicyPrefix}{nameof(PermissionKey.UsersList)}";
    public const string Roles = $"{PermissionPolicyProvider.PolicyPrefix}{nameof(PermissionKey.RolesList)}";

    public static string For(PermissionKey permission) =>
        $"{PermissionPolicyProvider.PolicyPrefix}{permission}";
}
