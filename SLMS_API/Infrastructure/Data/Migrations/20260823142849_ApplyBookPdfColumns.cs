using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ApplyBookPdfColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('Books', 'PdfFileName') IS NULL
                    ALTER TABLE Books ADD PdfFileName nvarchar(260) NULL;

                IF COL_LENGTH('Books', 'PdfStoragePath') IS NULL
                    ALTER TABLE Books ADD PdfStoragePath nvarchar(500) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('Books', 'PdfStoragePath') IS NOT NULL
                    ALTER TABLE Books DROP COLUMN PdfStoragePath;

                IF COL_LENGTH('Books', 'PdfFileName') IS NOT NULL
                    ALTER TABLE Books DROP COLUMN PdfFileName;
                """);
        }
    }
}
