using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPermissionsAndRolePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    PermissionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RolePermissions_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "Id", "Code", "Name" },
                values: new object[,]
                {
                    { 1, "dashboard.view", "Dashboard View" },
                    { 2, "members.view", "Members View" },
                    { 3, "members.manage", "Members Manage" },
                    { 4, "seats.view", "Seats View" },
                    { 5, "seats.manage", "Seats Manage" },
                    { 6, "attendance.view", "Attendance View" },
                    { 7, "attendance.manage", "Attendance Manage" },
                    { 8, "attendance.scanner.use", "Attendance Scanner Use" },
                    { 9, "institutions.manage", "Institutions Manage" },
                    { 10, "branches.manage", "Branches Manage" },
                    { 11, "libraries.manage", "Libraries Manage" },
                    { 12, "subscriptions.view", "Subscriptions View" },
                    { 13, "subscriptions.manage", "Subscriptions Manage" },
                    { 14, "payments.view", "Payments View" },
                    { 15, "books.view", "Books View" },
                    { 16, "books.manage", "Books Manage" },
                    { 17, "inventory.manage", "Inventory Manage" },
                    { 18, "users.manage", "Users Manage" },
                    { 19, "roles.manage", "Roles Manage" },
                    { 20, "reports.view", "Reports View" },
                    { 21, "notifications.manage", "Notifications Manage" },
                    { 22, "profile.view", "Profile View" },
                    { 23, "settings.manage", "Settings Manage" },
                    { 24, "support.view", "Support View" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Code",
                table: "Permissions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_RoleId_PermissionId",
                table: "RolePermissions",
                columns: new[] { "RoleId", "PermissionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "Permissions");
        }
    }
}
