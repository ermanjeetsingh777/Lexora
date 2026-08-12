using System.Text;
using SLMS_API.Common.Constants;

namespace SLMS_API.Infrastructure.Data;

public static class RoleSeedSql
{
    public static string GetSeedSql()
    {
        var sql = new StringBuilder();

        foreach (var roleName in RoleDefinitions.All)
        {
            var normalizedRoleName = roleName.ToUpperInvariant();
            sql.AppendLine($"""
                IF NOT EXISTS (SELECT 1 FROM AspNetRoles WHERE NormalizedName = '{normalizedRoleName}')
                BEGIN
                    INSERT INTO AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
                    VALUES (NEWID(), '{roleName}', '{normalizedRoleName}', NEWID());
                END
                """);
        }

        return sql.ToString();
    }
}
