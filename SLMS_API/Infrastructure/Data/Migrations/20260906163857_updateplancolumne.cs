using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class updateplancolumne : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: these UserPackages columns may already exist from
            // 20260830170000_AddUserPackageApprovalWorkflow (or a partial apply).
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'AdminRemarks')
                    ALTER TABLE [UserPackages] ADD [AdminRemarks] nvarchar(1000) NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovalStatus')
                    ALTER TABLE [UserPackages] ADD [ApprovalStatus] nvarchar(50) NOT NULL CONSTRAINT [DF_UserPackages_ApprovalStatus_v2] DEFAULT N'Approved';

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovedAtUtc')
                    ALTER TABLE [UserPackages] ADD [ApprovedAtUtc] datetime2 NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'ApprovedByUserId')
                    ALTER TABLE [UserPackages] ADD [ApprovedByUserId] nvarchar(max) NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'FinalApprovedAmount')
                    ALTER TABLE [UserPackages] ADD [FinalApprovedAmount] decimal(18,2) NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'Note')
                    ALTER TABLE [UserPackages] ADD [Note] nvarchar(1000) NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'PreviousPackageId')
                    ALTER TABLE [UserPackages] ADD [PreviousPackageId] uniqueidentifier NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'RejectedAtUtc')
                    ALTER TABLE [UserPackages] ADD [RejectedAtUtc] datetime2 NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[UserPackages]') AND name = 'RequestType')
                    ALTER TABLE [UserPackages] ADD [RequestType] nvarchar(50) NULL;

                IF OBJECT_ID(N'[CustomerReviews]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [CustomerReviews] (
                        [Id] uniqueidentifier NOT NULL,
                        [FullName] nvarchar(100) NOT NULL,
                        [Email] nvarchar(150) NOT NULL,
                        [OrganizationName] nvarchar(150) NULL,
                        [Role] nvarchar(100) NULL,
                        [Rating] int NOT NULL,
                        [Title] nvarchar(200) NULL,
                        [Comment] nvarchar(2000) NOT NULL,
                        [Suggestion] nvarchar(2000) NULL,
                        [Status] nvarchar(50) NOT NULL CONSTRAINT [DF_CustomerReviews_Status] DEFAULT N'Pending',
                        [IsApproved] bit NOT NULL,
                        [AdminRemarks] nvarchar(1000) NULL,
                        [ApprovedByUserId] nvarchar(max) NULL,
                        [ApprovedAtUtc] datetime2 NULL,
                        [RejectedAtUtc] datetime2 NULL,
                        [CreatedAtUtc] datetime2 NOT NULL,
                        [UpdatedAtUtc] datetime2 NULL,
                        [IsDeleted] bit NOT NULL,
                        CONSTRAINT [PK_CustomerReviews] PRIMARY KEY ([Id])
                    );

                    CREATE INDEX [IX_CustomerReviews_IsApproved_IsDeleted_CreatedAtUtc]
                        ON [CustomerReviews] ([IsApproved], [IsDeleted], [CreatedAtUtc]);
                END

                -- Due amount on member plans (Plan = Paid + Adjustment + Due)
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MemberPlans]') AND name = 'DueAmount')
                    ALTER TABLE [MemberPlans] ADD [DueAmount] decimal(18,2) NOT NULL CONSTRAINT [DF_MemberPlans_DueAmount] DEFAULT 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[MemberPlans]') AND name = 'DueAmount')
                    ALTER TABLE [MemberPlans] DROP COLUMN [DueAmount];

                IF OBJECT_ID(N'[CustomerReviews]', N'U') IS NOT NULL
                    DROP TABLE [CustomerReviews];

                -- Do not drop UserPackages approval columns on Down — they may have been
                -- introduced by an earlier migration still present in history.
            ");
        }
    }
}
