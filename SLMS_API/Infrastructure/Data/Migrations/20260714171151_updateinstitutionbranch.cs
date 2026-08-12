using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class updateinstitutionbranch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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
                name: "IX_Libraries_UserId_BranchId",
                table: "Libraries");

            migrationBuilder.DropIndex(
                name: "IX_Institutions_UserId",
                table: "Institutions");

            migrationBuilder.DropIndex(
                name: "IX_Branches_UserId_InstitutionId",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Libraries");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Branches");

            migrationBuilder.RenameColumn(
                name: "UserId1",
                table: "Libraries",
                newName: "ApplicationUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Libraries_UserId1",
                table: "Libraries",
                newName: "IX_Libraries_ApplicationUserId");

            migrationBuilder.RenameColumn(
                name: "UserId1",
                table: "Institutions",
                newName: "ApplicationUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Institutions_UserId1",
                table: "Institutions",
                newName: "IX_Institutions_ApplicationUserId");

            migrationBuilder.RenameColumn(
                name: "UserId1",
                table: "Branches",
                newName: "ApplicationUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Branches_UserId1",
                table: "Branches",
                newName: "IX_Branches_ApplicationUserId");

            migrationBuilder.AddColumn<int>(
                name: "UserType",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "UserBranches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBranches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserBranches_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserBranches_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserBranches_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserInstitutions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserInstitutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserInstitutions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserInstitutions_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserLibraries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BranchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LibraryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLibraries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserLibraries_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserLibraries_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserLibraries_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserLibraries_Libraries_LibraryId",
                        column: x => x.LibraryId,
                        principalTable: "Libraries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserBranches_BranchId",
                table: "UserBranches",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBranches_InstitutionId",
                table: "UserBranches",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserBranches_UserId",
                table: "UserBranches",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserInstitutions_InstitutionId",
                table: "UserInstitutions",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserInstitutions_UserId",
                table: "UserInstitutions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLibraries_BranchId",
                table: "UserLibraries",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLibraries_InstitutionId",
                table: "UserLibraries",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLibraries_LibraryId",
                table: "UserLibraries",
                column: "LibraryId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLibraries_UserId",
                table: "UserLibraries",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_AspNetUsers_ApplicationUserId",
                table: "Branches",
                column: "ApplicationUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Institutions_AspNetUsers_ApplicationUserId",
                table: "Institutions",
                column: "ApplicationUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Libraries_AspNetUsers_ApplicationUserId",
                table: "Libraries",
                column: "ApplicationUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Libraries_Institutions_InstitutionId",
                table: "Libraries",
                column: "InstitutionId",
                principalTable: "Institutions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branches_AspNetUsers_ApplicationUserId",
                table: "Branches");

            migrationBuilder.DropForeignKey(
                name: "FK_Institutions_AspNetUsers_ApplicationUserId",
                table: "Institutions");

            migrationBuilder.DropForeignKey(
                name: "FK_Libraries_AspNetUsers_ApplicationUserId",
                table: "Libraries");

            migrationBuilder.DropForeignKey(
                name: "FK_Libraries_Institutions_InstitutionId",
                table: "Libraries");

            migrationBuilder.DropTable(
                name: "UserBranches");

            migrationBuilder.DropTable(
                name: "UserInstitutions");

            migrationBuilder.DropTable(
                name: "UserLibraries");

            migrationBuilder.DropColumn(
                name: "UserType",
                table: "AspNetUsers");

            migrationBuilder.RenameColumn(
                name: "ApplicationUserId",
                table: "Libraries",
                newName: "UserId1");

            migrationBuilder.RenameIndex(
                name: "IX_Libraries_ApplicationUserId",
                table: "Libraries",
                newName: "IX_Libraries_UserId1");

            migrationBuilder.RenameColumn(
                name: "ApplicationUserId",
                table: "Institutions",
                newName: "UserId1");

            migrationBuilder.RenameIndex(
                name: "IX_Institutions_ApplicationUserId",
                table: "Institutions",
                newName: "IX_Institutions_UserId1");

            migrationBuilder.RenameColumn(
                name: "ApplicationUserId",
                table: "Branches",
                newName: "UserId1");

            migrationBuilder.RenameIndex(
                name: "IX_Branches_ApplicationUserId",
                table: "Branches",
                newName: "IX_Branches_UserId1");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Libraries",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Institutions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Branches",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Libraries_UserId_BranchId",
                table: "Libraries",
                columns: new[] { "UserId", "BranchId" });

            migrationBuilder.CreateIndex(
                name: "IX_Institutions_UserId",
                table: "Institutions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_UserId_InstitutionId",
                table: "Branches",
                columns: new[] { "UserId", "InstitutionId" });

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
    }
}
