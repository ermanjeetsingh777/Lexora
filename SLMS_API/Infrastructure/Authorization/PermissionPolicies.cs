using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public static class PermissionPolicies
{
    public const string Users = $"{PermissionPolicyProvider.PolicyPrefix}{nameof(PermissionKey.UsersManage)}";
    public const string Roles = $"{PermissionPolicyProvider.PolicyPrefix}{nameof(PermissionKey.RolesManage)}";

    public static string For(PermissionKey permission) =>
        $"{PermissionPolicyProvider.PolicyPrefix}{permission}";
}
