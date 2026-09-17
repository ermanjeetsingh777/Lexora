using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanScheduleAndAttendanceTiming : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeOnly>(
                name: "EndTime",
                table: "Plans",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "StartTime",
                table: "Plans",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LateMinutes",
                table: "MemberAttendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "OvertimeMinutes",
                table: "MemberAttendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("""
                UPDATE Plans
                SET StartTime = '09:00:00', EndTime = '18:00:00'
                WHERE StartTime IS NULL OR EndTime IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "LateMinutes",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "OvertimeMinutes",
                table: "MemberAttendances");
        }
    }
}
