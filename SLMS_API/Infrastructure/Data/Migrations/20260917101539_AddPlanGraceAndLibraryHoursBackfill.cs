using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanGraceAndLibraryHoursBackfill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GraceMinutes",
                table: "Plans",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.Sql("""
                UPDATE Plans SET GraceMinutes = 10 WHERE GraceMinutes = 0;

                UPDATE p
                SET
                    p.StartTime = h.OpenTime,
                    p.EndTime = h.CloseTime
                FROM Plans p
                INNER JOIN LibraryWeeklyHours h
                    ON h.LibraryId = p.LibraryId
                    AND LOWER(h.Day) = 'mon'
                    AND h.Closed = 0
                    AND h.OpenTime IS NOT NULL
                    AND h.CloseTime IS NOT NULL
                    AND h.CloseTime > h.OpenTime
                WHERE p.StartTime IS NULL
                   OR p.EndTime IS NULL
                   OR (CAST(p.StartTime AS time) = '09:00:00' AND CAST(p.EndTime AS time) = '18:00:00');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GraceMinutes",
                table: "Plans");
        }
    }
}
