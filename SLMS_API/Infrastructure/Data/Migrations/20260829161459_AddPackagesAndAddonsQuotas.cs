using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPackagesAndAddonsQuotas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxBranches",
                table: "Packages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxInstitutions",
                table: "Packages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxLibraries",
                table: "Packages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxMembers",
                table: "Packages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxUsers",
                table: "Packages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "Packages",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Addons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UnitQuantity = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DurationInDays = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Addons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserPackageAddons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserPackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AddonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    TotalExtraQuantity = table.Column<int>(type: "int", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StartDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaymentStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TransactionId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PaymentMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPackageAddons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPackageAddons_Addons_AddonId",
                        column: x => x.AddonId,
                        principalTable: "Addons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPackageAddons_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPackageAddons_UserPackages_UserPackageId",
                        column: x => x.UserPackageId,
                        principalTable: "UserPackages",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserPackageAddons_AddonId",
                table: "UserPackageAddons",
                column: "AddonId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPackageAddons_UserId",
                table: "UserPackageAddons",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPackageAddons_UserPackageId",
                table: "UserPackageAddons",
                column: "UserPackageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserPackageAddons");

            migrationBuilder.DropTable(
                name: "Addons");

            migrationBuilder.DropColumn(
                name: "MaxBranches",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "MaxInstitutions",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "MaxLibraries",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "MaxMembers",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "MaxUsers",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "Packages");
        }
    }
}
