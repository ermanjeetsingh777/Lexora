using Microsoft.EntityFrameworkCore.Migrations;
using SLMS_API.Infrastructure.Data;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SyncInstituteRolePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Deferred to ReseedCrudPermissions + DbSeeder.SeedRolePermissionsAsync.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
