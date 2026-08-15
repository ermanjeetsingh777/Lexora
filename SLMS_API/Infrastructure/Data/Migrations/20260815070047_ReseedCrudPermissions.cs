using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReseedCrudPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Code", "Name" },
                values: new object[] { "dashboard.list", "Dashboard List" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Code", "Name" },
                values: new object[] { "dashboard.create", "Dashboard Create" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Code", "Name" },
                values: new object[] { "dashboard.edit", "Dashboard Edit" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Code", "Name" },
                values: new object[] { "dashboard.update", "Dashboard Update" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Code", "Name" },
                values: new object[] { "dashboard.delete", "Dashboard Delete" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.view", "Members View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.list", "Members List" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.create", "Members Create" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.edit", "Members Edit" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.update", "Members Update" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.delete", "Members Delete" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 13,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.view", "Seats View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 14,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.list", "Seats List" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 15,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.create", "Seats Create" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 16,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.edit", "Seats Edit" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 17,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.update", "Seats Update" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 18,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.delete", "Seats Delete" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 19,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.view", "Attendance View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.list", "Attendance List" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 21,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.create", "Attendance Create" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 22,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.edit", "Attendance Edit" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 23,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.update", "Attendance Update" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 24,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.delete", "Attendance Delete" });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "Id", "Code", "Name" },
                values: new object[,]
                {
                    { 25, "institutions.view", "Institutions View" },
                    { 26, "institutions.list", "Institutions List" },
                    { 27, "institutions.create", "Institutions Create" },
                    { 28, "institutions.edit", "Institutions Edit" },
                    { 29, "institutions.update", "Institutions Update" },
                    { 30, "institutions.delete", "Institutions Delete" },
                    { 31, "branches.view", "Branches View" },
                    { 32, "branches.list", "Branches List" },
                    { 33, "branches.create", "Branches Create" },
                    { 34, "branches.edit", "Branches Edit" },
                    { 35, "branches.update", "Branches Update" },
                    { 36, "branches.delete", "Branches Delete" },
                    { 37, "libraries.view", "Libraries View" },
                    { 38, "libraries.list", "Libraries List" },
                    { 39, "libraries.create", "Libraries Create" },
                    { 40, "libraries.edit", "Libraries Edit" },
                    { 41, "libraries.update", "Libraries Update" },
                    { 42, "libraries.delete", "Libraries Delete" },
                    { 43, "subscriptions.view", "Subscriptions View" },
                    { 44, "subscriptions.list", "Subscriptions List" },
                    { 45, "subscriptions.create", "Subscriptions Create" },
                    { 46, "subscriptions.edit", "Subscriptions Edit" },
                    { 47, "subscriptions.update", "Subscriptions Update" },
                    { 48, "subscriptions.delete", "Subscriptions Delete" },
                    { 49, "payments.view", "Payments View" },
                    { 50, "payments.list", "Payments List" },
                    { 51, "payments.create", "Payments Create" },
                    { 52, "payments.edit", "Payments Edit" },
                    { 53, "payments.update", "Payments Update" },
                    { 54, "payments.delete", "Payments Delete" },
                    { 55, "books.view", "Books View" },
                    { 56, "books.list", "Books List" },
                    { 57, "books.create", "Books Create" },
                    { 58, "books.edit", "Books Edit" },
                    { 59, "books.update", "Books Update" },
                    { 60, "books.delete", "Books Delete" },
                    { 61, "inventory.view", "Inventory View" },
                    { 62, "inventory.list", "Inventory List" },
                    { 63, "inventory.create", "Inventory Create" },
                    { 64, "inventory.edit", "Inventory Edit" },
                    { 65, "inventory.update", "Inventory Update" },
                    { 66, "inventory.delete", "Inventory Delete" },
                    { 67, "users.view", "Users View" },
                    { 68, "users.list", "Users List" },
                    { 69, "users.create", "Users Create" },
                    { 70, "users.edit", "Users Edit" },
                    { 71, "users.update", "Users Update" },
                    { 72, "users.delete", "Users Delete" },
                    { 73, "roles.view", "Roles View" },
                    { 74, "roles.list", "Roles List" },
                    { 75, "roles.create", "Roles Create" },
                    { 76, "roles.edit", "Roles Edit" },
                    { 77, "roles.update", "Roles Update" },
                    { 78, "roles.delete", "Roles Delete" },
                    { 79, "reports.view", "Reports View" },
                    { 80, "reports.list", "Reports List" },
                    { 81, "reports.create", "Reports Create" },
                    { 82, "reports.edit", "Reports Edit" },
                    { 83, "reports.update", "Reports Update" },
                    { 84, "reports.delete", "Reports Delete" },
                    { 85, "notifications.view", "Notifications View" },
                    { 86, "notifications.list", "Notifications List" },
                    { 87, "notifications.create", "Notifications Create" },
                    { 88, "notifications.edit", "Notifications Edit" },
                    { 89, "notifications.update", "Notifications Update" },
                    { 90, "notifications.delete", "Notifications Delete" },
                    { 91, "profile.view", "Profile View" },
                    { 92, "profile.list", "Profile List" },
                    { 93, "profile.create", "Profile Create" },
                    { 94, "profile.edit", "Profile Edit" },
                    { 95, "profile.update", "Profile Update" },
                    { 96, "profile.delete", "Profile Delete" },
                    { 97, "settings.view", "Settings View" },
                    { 98, "settings.list", "Settings List" },
                    { 99, "settings.create", "Settings Create" },
                    { 100, "settings.edit", "Settings Edit" },
                    { 101, "settings.update", "Settings Update" },
                    { 102, "settings.delete", "Settings Delete" },
                    { 103, "support.view", "Support View" },
                    { 104, "support.list", "Support List" },
                    { 105, "support.create", "Support Create" },
                    { 106, "support.edit", "Support Edit" },
                    { 107, "support.update", "Support Update" },
                    { 108, "support.delete", "Support Delete" },
                    { 109, "attendance.scanner.use", "Attendance Scanner Use" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 26);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 28);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 29);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 30);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 31);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 32);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 33);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 34);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 35);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 36);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 37);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 38);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 39);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 40);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 41);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 42);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 43);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 44);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 45);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 46);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 47);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 48);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 49);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 50);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 51);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 52);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 53);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 54);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 55);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 56);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 57);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 58);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 59);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 60);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 61);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 62);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 63);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 64);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 65);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 66);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 67);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 68);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 69);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 70);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 71);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 72);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 73);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 74);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 75);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 76);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 77);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 78);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 79);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 80);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 81);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 82);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 83);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 84);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 85);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 86);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 87);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 88);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 89);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 90);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 91);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 92);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 93);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 94);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 95);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 96);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 97);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 98);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 99);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 100);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 101);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 102);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 103);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 104);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 105);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 106);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 107);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 108);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 109);

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.view", "Members View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Code", "Name" },
                values: new object[] { "members.manage", "Members Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.view", "Seats View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Code", "Name" },
                values: new object[] { "seats.manage", "Seats Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.view", "Attendance View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.manage", "Attendance Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "Code", "Name" },
                values: new object[] { "attendance.scanner.use", "Attendance Scanner Use" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "Code", "Name" },
                values: new object[] { "institutions.manage", "Institutions Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "Code", "Name" },
                values: new object[] { "branches.manage", "Branches Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 11,
                columns: new[] { "Code", "Name" },
                values: new object[] { "libraries.manage", "Libraries Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 12,
                columns: new[] { "Code", "Name" },
                values: new object[] { "subscriptions.view", "Subscriptions View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 13,
                columns: new[] { "Code", "Name" },
                values: new object[] { "subscriptions.manage", "Subscriptions Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 14,
                columns: new[] { "Code", "Name" },
                values: new object[] { "payments.view", "Payments View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 15,
                columns: new[] { "Code", "Name" },
                values: new object[] { "books.view", "Books View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 16,
                columns: new[] { "Code", "Name" },
                values: new object[] { "books.manage", "Books Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 17,
                columns: new[] { "Code", "Name" },
                values: new object[] { "inventory.manage", "Inventory Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 18,
                columns: new[] { "Code", "Name" },
                values: new object[] { "users.manage", "Users Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 19,
                columns: new[] { "Code", "Name" },
                values: new object[] { "roles.manage", "Roles Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "Code", "Name" },
                values: new object[] { "reports.view", "Reports View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 21,
                columns: new[] { "Code", "Name" },
                values: new object[] { "notifications.manage", "Notifications Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 22,
                columns: new[] { "Code", "Name" },
                values: new object[] { "profile.view", "Profile View" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 23,
                columns: new[] { "Code", "Name" },
                values: new object[] { "settings.manage", "Settings Manage" });

            migrationBuilder.UpdateData(
                table: "Permissions",
                keyColumn: "Id",
                keyValue: 24,
                columns: new[] { "Code", "Name" },
                values: new object[] { "support.view", "Support View" });
        }
    }
}
