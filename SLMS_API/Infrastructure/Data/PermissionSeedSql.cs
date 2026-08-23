using System.Text;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Infrastructure.Data;

public static class PermissionSeedSql
{
    /// <summary>
    /// Upserts every permission from <see cref="PermissionSeedData"/> (IDs 1–109).
    /// Safe when legacy rows already exist (e.g. IDs 25–26 from an older migration).
    /// </summary>
    public static string GetMergeSql()
    {
        var sql = new StringBuilder();

        foreach (var permission in PermissionSeedData.GetAll())
        {
            var code = permission.Code.Replace("'", "''");
            var name = permission.Name.Replace("'", "''");

            sql.AppendLine($"""
                IF EXISTS (SELECT 1 FROM Permissions WHERE Id = {permission.Id})
                    UPDATE Permissions SET Code = N'{code}', Name = N'{name}' WHERE Id = {permission.Id};
                ELSE
                    INSERT INTO Permissions (Id, Code, Name) VALUES ({permission.Id}, N'{code}', N'{name}');
                """);
        }

        return sql.ToString();
    }
}
