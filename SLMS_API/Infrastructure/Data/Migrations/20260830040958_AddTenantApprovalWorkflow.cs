using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SLMS_API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'ApprovalStatus')
                BEGIN
                    ALTER TABLE [AspNetUsers] ADD [ApprovalStatus] nvarchar(50) NOT NULL CONSTRAINT [DF_AspNetUsers_ApprovalStatus] DEFAULT N'Pending';
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'AdminRemarks')
                BEGIN
                    ALTER TABLE [AspNetUsers] ADD [AdminRemarks] nvarchar(1000) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'FinalApprovedAmount')
                BEGIN
                    ALTER TABLE [AspNetUsers] ADD [FinalApprovedAmount] decimal(18,2) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'ApprovedAtUtc')
                BEGIN
                    ALTER TABLE [AspNetUsers] ADD [ApprovedAtUtc] datetime2 NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'RejectedAtUtc')
                BEGIN
                    ALTER TABLE [AspNetUsers] ADD [RejectedAtUtc] datetime2 NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'ApprovedByUserId')
                BEGIN
                    ALTER TABLE [AspNetUsers] ADD [ApprovedByUserId] nvarchar(max) NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'ApprovalStatus')
                BEGIN
                    ALTER TABLE [AspNetUsers] DROP COLUMN [ApprovalStatus];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'AdminRemarks')
                BEGIN
                    ALTER TABLE [AspNetUsers] DROP COLUMN [AdminRemarks];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'FinalApprovedAmount')
                BEGIN
                    ALTER TABLE [AspNetUsers] DROP COLUMN [FinalApprovedAmount];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'ApprovedAtUtc')
                BEGIN
                    ALTER TABLE [AspNetUsers] DROP COLUMN [ApprovedAtUtc];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'RejectedAtUtc')
                BEGIN
                    ALTER TABLE [AspNetUsers] DROP COLUMN [RejectedAtUtc];
                END

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[AspNetUsers]') AND name = 'ApprovedByUserId')
                BEGIN
                    ALTER TABLE [AspNetUsers] DROP COLUMN [ApprovedByUserId];
                END
            ");
        }
    }
}
