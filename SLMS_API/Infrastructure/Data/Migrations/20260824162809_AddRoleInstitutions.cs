using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleInstitutions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RoleInstitutions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleInstitutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleInstitutions_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoleInstitutions_InstitutionId",
                table: "RoleInstitutions",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleInstitutions_RoleId_InstitutionId",
                table: "RoleInstitutions",
                columns: new[] { "RoleId", "InstitutionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoleInstitutions");
        }
    }
}
