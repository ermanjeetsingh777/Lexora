using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260830170000_AddUserPackageApprovalWorkflow")]
    public partial class AddUserPackageApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovalStatus')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [ApprovalStatus] nvarchar(50) NOT NULL CONSTRAINT [DF_UserPackages_ApprovalStatus] DEFAULT N'Approved';
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'AdminRemarks')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [AdminRemarks] nvarchar(1000) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'FinalApprovedAmount')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [FinalApprovedAmount] decimal(18,2) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [ApprovedAtUtc] datetime2 NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'RejectedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [RejectedAtUtc] datetime2 NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovedByUserId')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [ApprovedByUserId] nvarchar(max) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'RequestType')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [RequestType] nvarchar(50) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'Note')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [Note] nvarchar(1000) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'PreviousPackageId')
                BEGIN
                    ALTER TABLE [UserPackages] ADD [PreviousPackageId] uniqueidentifier NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovalStatus')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [ApprovalStatus];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'AdminRemarks')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [AdminRemarks];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'FinalApprovedAmount')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [FinalApprovedAmount];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [ApprovedAtUtc];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'RejectedAtUtc')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [RejectedAtUtc];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovedByUserId')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [ApprovedByUserId];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'RequestType')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [RequestType];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'Note')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [Note];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'PreviousPackageId')
                BEGIN
                    ALTER TABLE [UserPackages] DROP COLUMN [PreviousPackageId];
                END
            ");
        }
    }
}
