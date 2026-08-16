using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberAttendanceQrToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttendanceQrToken",
                table: "Members",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Members_AttendanceQrToken",
                table: "Members",
                column: "AttendanceQrToken",
                unique: true,
                filter: "[AttendanceQrToken] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Members_AttendanceQrToken",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "AttendanceQrToken",
                table: "Members");
        }
    }
}
