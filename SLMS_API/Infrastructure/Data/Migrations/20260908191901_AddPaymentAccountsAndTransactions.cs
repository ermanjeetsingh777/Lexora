using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentAccountsAndTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PaymentAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Mode = table.Column<int>(type: "int", nullable: false),
                    UpiPayeeName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UpiVpa = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    RazorpayKeyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RazorpayKeySecretProtected = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RazorpayWebhookSecretProtected = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    WebhookToken = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    FirstCapturedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                    table.PrimaryKey("PK_PaymentAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentAccounts_Institutions_InstitutionId",
                        column: x => x.InstitutionId,
                        principalTable: "Institutions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Purpose = table.Column<int>(type: "int", nullable: false),
                    Provider = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    InstitutionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PaymentAccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MemberPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    UserPackageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false, defaultValue: "INR"),
                    PayerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PayerEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    PayerPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ProviderOrderId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ProviderPaymentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ProviderSignature = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    UpiUtr = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    FailureReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RawPayload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VerifiedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    VerifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CapturedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentTransactions_PaymentAccounts_PaymentAccountId",
                        column: x => x.PaymentAccountId,
                        principalTable: "PaymentAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAccounts_InstitutionId",
                table: "PaymentAccounts",
                column: "InstitutionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAccounts_WebhookToken",
                table: "PaymentAccounts",
                column: "WebhookToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_InstitutionId_Status_CreatedAtUtc",
                table: "PaymentTransactions",
                columns: new[] { "InstitutionId", "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_MemberId_Status",
                table: "PaymentTransactions",
                columns: new[] { "MemberId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_PaymentAccountId",
                table: "PaymentTransactions",
                column: "PaymentAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_ProviderOrderId",
                table: "PaymentTransactions",
                column: "ProviderOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_ProviderPaymentId",
                table: "PaymentTransactions",
                column: "ProviderPaymentId",
                unique: true,
                filter: "[ProviderPaymentId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_Reference",
                table: "PaymentTransactions",
                column: "Reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_UserId_Purpose_Status",
                table: "PaymentTransactions",
                columns: new[] { "UserId", "Purpose", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentTransactions");

            migrationBuilder.DropTable(
                name: "PaymentAccounts");
        }
    }
}
