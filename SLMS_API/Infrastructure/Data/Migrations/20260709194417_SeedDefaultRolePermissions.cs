using Microsoft.EntityFrameworkCore.Migrations;
using SLMS_API.Infrastructure.Data;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeedDefaultRolePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Role-permission links require all Permission rows (1–109).
            // Those are created in ReseedCrudPermissions; full sync runs there and at app startup (DbSeeder).
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
