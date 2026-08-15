using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookLoanFinesAndNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultLoanDays",
                table: "Libraries",
                type: "int",
                nullable: false,
                defaultValue: 14);

            migrationBuilder.AddColumn<decimal>(
                name: "OverdueFinePerDay",
                table: "Libraries",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 10m);

            migrationBuilder.AddColumn<decimal>(
                name: "FineAmount",
                table: "BookLoans",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastReminderSentAtUtc",
                table: "BookLoans",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LoanDays",
                table: "BookLoans",
                type: "int",
                nullable: false,
                defaultValue: 14);

            migrationBuilder.AddColumn<int>(
                name: "OverdueDays",
                table: "BookLoans",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UserNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BookLoanId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    NotificationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserNotifications_UserId_IsRead_CreatedAtUtc",
                table: "UserNotifications",
                columns: new[] { "UserId", "IsRead", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "DefaultLoanDays",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "OverdueFinePerDay",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "FineAmount",
                table: "BookLoans");

            migrationBuilder.DropColumn(
                name: "LastReminderSentAtUtc",
                table: "BookLoans");

            migrationBuilder.DropColumn(
                name: "LoanDays",
                table: "BookLoans");

            migrationBuilder.DropColumn(
                name: "OverdueDays",
                table: "BookLoans");
        }
    }
}
