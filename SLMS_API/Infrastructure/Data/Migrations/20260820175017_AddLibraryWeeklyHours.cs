using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLibraryWeeklyHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LibraryWeeklyHours",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LibraryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Day = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    Closed = table.Column<bool>(type: "bit", nullable: false),
                    OpenTime = table.Column<TimeOnly>(type: "time", nullable: true),
                    CloseTime = table.Column<TimeOnly>(type: "time", nullable: true),
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
                    table.PrimaryKey("PK_LibraryWeeklyHours", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LibraryWeeklyHours_Libraries_LibraryId",
                        column: x => x.LibraryId,
                        principalTable: "Libraries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LibraryHoursExceptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LibraryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Closed = table.Column<bool>(type: "bit", nullable: false),
                    OpenTime = table.Column<TimeOnly>(type: "time", nullable: true),
                    CloseTime = table.Column<TimeOnly>(type: "time", nullable: true),
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
                    table.PrimaryKey("PK_LibraryHoursExceptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LibraryHoursExceptions_Libraries_LibraryId",
                        column: x => x.LibraryId,
                        principalTable: "Libraries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LibraryWeeklyHours_LibraryId_Day",
                table: "LibraryWeeklyHours",
                columns: new[] { "LibraryId", "Day" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LibraryHoursExceptions_LibraryId_IsDeleted_StartDate",
                table: "LibraryHoursExceptions",
                columns: new[] { "LibraryId", "IsDeleted", "StartDate" });

            migrationBuilder.Sql("""
                INSERT INTO LibraryWeeklyHours
                    (Id, LibraryId, Day, Closed, OpenTime, CloseTime, IsActive, CreatedAtUtc, IsDeleted)
                SELECT
                    NEWID(),
                    l.Id,
                    d.Day,
                    CASE WHEN b.OperatingHoursStart IS NULL OR b.OperatingHoursEnd IS NULL THEN 1 ELSE 0 END,
                    b.OperatingHoursStart,
                    b.OperatingHoursEnd,
                    1,
                    SYSUTCDATETIME(),
                    0
                FROM Libraries l
                INNER JOIN Branches b ON b.Id = l.BranchId
                CROSS JOIN (VALUES ('mon'), ('tue'), ('wed'), ('thu'), ('fri'), ('sat'), ('sun')) AS d(Day)
                WHERE l.IsDeleted = 0
                  AND NOT EXISTS (
                      SELECT 1
                      FROM LibraryWeeklyHours h
                      WHERE h.LibraryId = l.Id AND h.Day = d.Day AND h.IsDeleted = 0
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LibraryHoursExceptions");

            migrationBuilder.DropTable(
                name: "LibraryWeeklyHours");
        }
    }
}
