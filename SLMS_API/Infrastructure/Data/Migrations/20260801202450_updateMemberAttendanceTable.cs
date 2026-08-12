using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class updateMemberAttendanceTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<TimeOnly>(
                name: "CheckOutTime",
                table: "MemberAttendances",
                type: "time",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<TimeOnly>(
                name: "CheckInTime",
                table: "MemberAttendances",
                type: "time",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<DateOnly>(
                name: "AttendanceDate",
                table: "MemberAttendances",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAtUtc",
                table: "MemberAttendances",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "MemberAttendances",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "MemberAttendances",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeviceId",
                table: "MemberAttendances",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "MemberAttendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "MemberAttendances",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "MemberAttendances",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SeatNo",
                table: "MemberAttendances",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "MemberAttendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "MemberAttendances",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "MemberAttendances",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttendanceDate",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "CreatedAtUtc",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "DeviceId",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "SeatNo",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "MemberAttendances");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "MemberAttendances");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CheckOutTime",
                table: "MemberAttendances",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(TimeOnly),
                oldType: "time",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CheckInTime",
                table: "MemberAttendances",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(TimeOnly),
                oldType: "time",
                oldNullable: true);
        }
    }
}
