using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberGuardianContactTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MemberGuardianContact_Members_MemberId",
                table: "MemberGuardianContact");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MemberGuardianContact",
                table: "MemberGuardianContact");

            migrationBuilder.RenameTable(
                name: "MemberGuardianContact",
                newName: "MemberGuardianContacts");

            migrationBuilder.RenameIndex(
                name: "IX_MemberGuardianContact_MemberId",
                table: "MemberGuardianContacts",
                newName: "IX_MemberGuardianContacts_MemberId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MemberGuardianContacts",
                table: "MemberGuardianContacts",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MemberGuardianContacts_Members_MemberId",
                table: "MemberGuardianContacts",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MemberGuardianContacts_Members_MemberId",
                table: "MemberGuardianContacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MemberGuardianContacts",
                table: "MemberGuardianContacts");

            migrationBuilder.RenameTable(
                name: "MemberGuardianContacts",
                newName: "MemberGuardianContact");

            migrationBuilder.RenameIndex(
                name: "IX_MemberGuardianContacts_MemberId",
                table: "MemberGuardianContact",
                newName: "IX_MemberGuardianContact_MemberId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MemberGuardianContact",
                table: "MemberGuardianContact",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_MemberGuardianContact_Members_MemberId",
                table: "MemberGuardianContact",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
