using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    [Migration("20260909153000_AddPaymentTransactionUserPackageAddonId")]
    public partial class AddPaymentTransactionUserPackageAddonId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET QUOTED_IDENTIFIER ON;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[PaymentTransactions]') AND name = 'UserPackageAddonId')
                BEGIN
                    ALTER TABLE [PaymentTransactions] ADD [UserPackageAddonId] uniqueidentifier NULL;
                END

                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_PaymentTransactions_UserPackageAddonId'
                      AND object_id = OBJECT_ID(N'[PaymentTransactions]'))
                BEGIN
                    CREATE INDEX [IX_PaymentTransactions_UserPackageAddonId]
                        ON [PaymentTransactions] ([UserPackageAddonId]);
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = N'IX_PaymentTransactions_UserPackageAddonId'
                      AND object_id = OBJECT_ID(N'[PaymentTransactions]'))
                BEGIN
                    DROP INDEX [IX_PaymentTransactions_UserPackageAddonId] ON [PaymentTransactions];
                END

                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[PaymentTransactions]') AND name = 'UserPackageAddonId')
                BEGIN
                    ALTER TABLE [PaymentTransactions] DROP COLUMN [UserPackageAddonId];
                END
            ");
        }
    }
}
