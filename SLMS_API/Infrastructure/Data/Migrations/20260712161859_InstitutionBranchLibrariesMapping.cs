using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InstitutionBranchLibrariesMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TenantId",
                table: "Libraries",
                newName: "UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Libraries_TenantId_BranchId",
                table: "Libraries",
                newName: "IX_Libraries_UserId_BranchId");

            migrationBuilder.RenameColumn(
                name: "TenantId",
                table: "Institutions",
                newName: "UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Institutions_TenantId",
                table: "Institutions",
                newName: "IX_Institutions_UserId");

            migrationBuilder.RenameColumn(
                name: "TenantId",
                table: "Branches",
                newName: "UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Branches_TenantId_InstitutionId",
                table: "Branches",
                newName: "IX_Branches_UserId_InstitutionId");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Libraries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InstitutionId",
                table: "Libraries",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Libraries",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId1",
                table: "Libraries",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId1",
                table: "Institutions",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Branches",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Branches",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId1",
                table: "Branches",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Libraries_InstitutionId",
                table: "Libraries",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_Libraries_UserId1",
                table: "Libraries",
                column: "UserId1");

            migrationBuilder.CreateIndex(
                name: "IX_Institutions_UserId1",
                table: "Institutions",
                column: "UserId1");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_UserId1",
                table: "Branches",
                column: "UserId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_AspNetUsers_UserId1",
                table: "Branches",
                column: "UserId1",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Institutions_AspNetUsers_UserId1",
                table: "Institutions",
                column: "UserId1",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Libraries_AspNetUsers_UserId1",
                table: "Libraries",
                column: "UserId1",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Libraries_Institutions_InstitutionId",
                table: "Libraries",
                column: "InstitutionId",
                principalTable: "Institutions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branches_AspNetUsers_UserId1",
                table: "Branches");

            migrationBuilder.DropForeignKey(
                name: "FK_Institutions_AspNetUsers_UserId1",
                table: "Institutions");

            migrationBuilder.DropForeignKey(
                name: "FK_Libraries_AspNetUsers_UserId1",
                table: "Libraries");

            migrationBuilder.DropForeignKey(
                name: "FK_Libraries_Institutions_InstitutionId",
                table: "Libraries");

            migrationBuilder.DropIndex(
                name: "IX_Libraries_InstitutionId",
                table: "Libraries");

            migrationBuilder.DropIndex(
                name: "IX_Libraries_UserId1",
                table: "Libraries");

            migrationBuilder.DropIndex(
                name: "IX_Institutions_UserId1",
                table: "Institutions");

            migrationBuilder.DropIndex(
                name: "IX_Branches_UserId1",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "InstitutionId",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "Branches");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Libraries",
                newName: "TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_Libraries_UserId_BranchId",
                table: "Libraries",
                newName: "IX_Libraries_TenantId_BranchId");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Institutions",
                newName: "TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_Institutions_UserId",
                table: "Institutions",
                newName: "IX_Institutions_TenantId");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Branches",
                newName: "TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_Branches_UserId_InstitutionId",
                table: "Branches",
                newName: "IX_Branches_TenantId_InstitutionId");
        }
    }
}
