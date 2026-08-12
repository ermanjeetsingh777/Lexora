using System.Text;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Data;

public static class RolePermissionSeedSql
{
    public static string GetSeedSql()
    {
        var sql = new StringBuilder();
        var allPermissionCount = Enum.GetValues<PermissionKey>().Length;
        var map = RolePermissionDefinitions.GetDefaultRolePermissionMap();

        foreach (var (roleName, permissions) in map)
        {
            var normalizedRoleName = roleName.ToUpperInvariant();

            if (permissions.Length == allPermissionCount)
            {
                sql.AppendLine($"""
                    INSERT INTO RolePermissions (RoleId, PermissionId)
                    SELECT r.Id, p.Id
                    FROM AspNetRoles r
                    CROSS JOIN Permissions p
                    WHERE r.NormalizedName = '{normalizedRoleName}'
                    AND NOT EXISTS (
                        SELECT 1 FROM RolePermissions rp
                        WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
                    );
                    """);
                continue;
            }

            var permissionValues = string.Join(
                ",",
                permissions.Distinct().Select(permission => $"({(int)permission})"));

            sql.AppendLine($"""
                INSERT INTO RolePermissions (RoleId, PermissionId)
                SELECT r.Id, v.PermissionId
                FROM AspNetRoles r
                CROSS JOIN (VALUES {permissionValues}) AS v(PermissionId)
                WHERE r.NormalizedName = '{normalizedRoleName}'
                AND NOT EXISTS (
                    SELECT 1 FROM RolePermissions rp
                    WHERE rp.RoleId = r.Id AND rp.PermissionId = v.PermissionId
                );
                """);
        }

        return sql.ToString();
    }
}
