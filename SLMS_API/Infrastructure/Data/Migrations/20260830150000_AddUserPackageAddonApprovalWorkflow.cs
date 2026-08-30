using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPackageAddonApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus",
                table: "UserPackageAddons",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "AdminRemarks",
                table: "UserPackageAddons",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FinalApprovedAmount",
                table: "UserPackageAddons",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAtUtc",
                table: "UserPackageAddons",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAtUtc",
                table: "UserPackageAddons",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedByUserId",
                table: "UserPackageAddons",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "UserPackageAddons");

            migrationBuilder.DropColumn(
                name: "AdminRemarks",
                table: "UserPackageAddons");

            migrationBuilder.DropColumn(
                name: "FinalApprovedAmount",
                table: "UserPackageAddons");

            migrationBuilder.DropColumn(
                name: "ApprovedAtUtc",
                table: "UserPackageAddons");

            migrationBuilder.DropColumn(
                name: "RejectedAtUtc",
                table: "UserPackageAddons");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "UserPackageAddons");
        }
    }
}
