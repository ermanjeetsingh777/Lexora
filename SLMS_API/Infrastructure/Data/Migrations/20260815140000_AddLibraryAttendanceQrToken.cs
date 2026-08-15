using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLibraryAttendanceQrToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttendanceQrToken",
                table: "Libraries",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                "UPDATE [Libraries] SET [AttendanceQrToken] = REPLACE(CONVERT(nvarchar(36), NEWID()), '-', '') WHERE [AttendanceQrToken] = N''");

            migrationBuilder.CreateIndex(
                name: "IX_Libraries_AttendanceQrToken",
                table: "Libraries",
                column: "AttendanceQrToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Libraries_AttendanceQrToken",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "AttendanceQrToken",
                table: "Libraries");
        }
    }
}
