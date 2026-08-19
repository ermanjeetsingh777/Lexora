using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeLibraryListQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MemberPlans_MemberId",
                table: "MemberPlans");

            migrationBuilder.DropIndex(
                name: "IX_MemberLibraries_BranchId",
                table: "MemberLibraries");

            migrationBuilder.DropIndex(
                name: "IX_MemberLibraries_InstitutionId",
                table: "MemberLibraries");

            migrationBuilder.DropIndex(
                name: "IX_MemberLibraries_LibraryId",
                table: "MemberLibraries");

            migrationBuilder.CreateIndex(
                name: "IX_MemberPlans_MemberId_IsDeleted",
                table: "MemberPlans",
                columns: new[] { "MemberId", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_MemberLibraries_BranchId_IsDeleted_IsCurrent",
                table: "MemberLibraries",
                columns: new[] { "BranchId", "IsDeleted", "IsCurrent" });

            migrationBuilder.CreateIndex(
                name: "IX_MemberLibraries_InstitutionId_IsDeleted_IsCurrent",
                table: "MemberLibraries",
                columns: new[] { "InstitutionId", "IsDeleted", "IsCurrent" });

            migrationBuilder.CreateIndex(
                name: "IX_MemberLibraries_LibraryId_IsDeleted_IsCurrent",
                table: "MemberLibraries",
                columns: new[] { "LibraryId", "IsDeleted", "IsCurrent" });

            migrationBuilder.CreateIndex(
                name: "IX_Libraries_IsDeleted_InstitutionId_BranchId",
                table: "Libraries",
                columns: new[] { "IsDeleted", "InstitutionId", "BranchId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MemberPlans_MemberId_IsDeleted",
                table: "MemberPlans");

            migrationBuilder.DropIndex(
                name: "IX_MemberLibraries_BranchId_IsDeleted_IsCurrent",
                table: "MemberLibraries");

            migrationBuilder.DropIndex(
                name: "IX_MemberLibraries_InstitutionId_IsDeleted_IsCurrent",
                table: "MemberLibraries");

            migrationBuilder.DropIndex(
                name: "IX_MemberLibraries_LibraryId_IsDeleted_IsCurrent",
                table: "MemberLibraries");

            migrationBuilder.DropIndex(
                name: "IX_Libraries_IsDeleted_InstitutionId_BranchId",
                table: "Libraries");

            migrationBuilder.CreateIndex(
                name: "IX_MemberPlans_MemberId",
                table: "MemberPlans",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberLibraries_BranchId",
                table: "MemberLibraries",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberLibraries_InstitutionId",
                table: "MemberLibraries",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_MemberLibraries_LibraryId",
                table: "MemberLibraries",
                column: "LibraryId");
        }
    }
}
