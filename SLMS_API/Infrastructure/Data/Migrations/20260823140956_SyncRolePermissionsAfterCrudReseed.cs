using Microsoft.EntityFrameworkCore.Migrations;
using SLMS_API.Infrastructure.Data;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SyncRolePermissionsAfterCrudReseed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(PermissionSeedSql.GetMergeSql());
            migrationBuilder.Sql(RolePermissionSeedSql.GetSeedSql());
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
