using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPackageAddonApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'ApprovalStatus')
                BEGIN
                    ALTER TABLE [UserPackageAddons] ADD [ApprovalStatus] nvarchar(50) NOT NULL CONSTRAINT [DF_UserPackageAddons_ApprovalStatus] DEFAULT N'Pending';
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'AdminRemarks')
                BEGIN
                    ALTER TABLE [UserPackageAddons] ADD [AdminRemarks] nvarchar(1000) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'FinalApprovedAmount')
                BEGIN
                    ALTER TABLE [UserPackageAddons] ADD [FinalApprovedAmount] decimal(18,2) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'ApprovedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackageAddons] ADD [ApprovedAtUtc] datetime2 NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'RejectedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackageAddons] ADD [RejectedAtUtc] datetime2 NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'ApprovedByUserId')
                BEGIN
                    ALTER TABLE [UserPackageAddons] ADD [ApprovedByUserId] nvarchar(max) NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'ApprovalStatus')
                BEGIN
                    ALTER TABLE [UserPackageAddons] DROP COLUMN [ApprovalStatus];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'AdminRemarks')
                BEGIN
                    ALTER TABLE [UserPackageAddons] DROP COLUMN [AdminRemarks];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'FinalApprovedAmount')
                BEGIN
                    ALTER TABLE [UserPackageAddons] DROP COLUMN [FinalApprovedAmount];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'ApprovedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackageAddons] DROP COLUMN [ApprovedAtUtc];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'RejectedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackageAddons] DROP COLUMN [RejectedAtUtc];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackageAddons]') AND name = 'ApprovedByUserId')
                BEGIN
                    ALTER TABLE [UserPackageAddons] DROP COLUMN [ApprovedByUserId];
                END
            ");
        }
    }
}
