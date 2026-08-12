using System.Text;

namespace SLMS_API.Infrastructure.Data
{
    public static class PackageSeedSql
    {
        public static string GetSeedSql()
        {
            var sql = new StringBuilder();

            sql.AppendLine("""
            IF NOT EXISTS (SELECT 1 FROM Packages WHERE Id = '11111111-1111-1111-1111-111111111111')
            BEGIN
                INSERT INTO Packages
                (
                    Id,
                    Name,
                    Code,
                    Category,
                    Price,
                    Description,
                    IsPopular,
                    CtaLabel,
                    DurationInDays,
                    IsActive,
                    CreatedAtUtc
                )
                VALUES
                (
                    '11111111-1111-1111-1111-111111111111',
                    'Trial',
                    'Trial',
                    'Starter',
                    0.00,
                    'Perfect for small, independent libraries just getting started with essential management tools.',
                    0,
                    'Select Trial',
                    14,
                    1,
                    GETUTCDATE()
                );
            END
            """);

            sql.AppendLine("""
            IF NOT EXISTS (SELECT 1 FROM Packages WHERE Id = '22222222-2222-2222-2222-222222222222')
            BEGIN
                INSERT INTO Packages
                (
                    Id,
                    Name,
                    Code,
                    Category,
                    Price,
                    Description,
                    IsPopular,
                    CtaLabel,
                    DurationInDays,
                    IsActive,
                    CreatedAtUtc
                )
                VALUES
                (
                    '22222222-2222-2222-2222-222222222222',
                    'Basic',
                    'Basic',
                    'Starter',
                    2499.00,
                    'Perfect for small, independent libraries just getting started with essential management tools.',
                    0,
                    'Select Basic',
                    365,
                    1,
                    GETUTCDATE()
                );
            END
            """);

            sql.AppendLine("""
            IF NOT EXISTS (SELECT 1 FROM Packages WHERE Id = '33333333-3333-3333-3333-333333333333')
            BEGIN
                INSERT INTO Packages
                (
                    Id,
                    Name,
                    Code,
                    Category,
                    Price,
                    Description,
                    IsPopular,
                    CtaLabel,
                    DurationInDays,
                    IsActive,
                    CreatedAtUtc
                )
                VALUES
                (
                    '33333333-3333-3333-3333-333333333333',
                    'Value',
                    'Value',
                    'Professional',
                    4999.00,
                    'Ideal for growing institutions that need to manage multiple library branches.',
                    1,
                    'Select Value',
                    365,
                    1,
                    GETUTCDATE()
                );
            END
            """);

            sql.AppendLine("""
            IF NOT EXISTS (SELECT 1 FROM Packages WHERE Id = '44444444-4444-4444-4444-444444444444')
            BEGIN
                INSERT INTO Packages
                (
                    Id,
                    Name,
                    Code,
                    Category,
                    Price,
                    Description,
                    IsPopular,
                    CtaLabel,
                    DurationInDays,
                    IsActive,
                    CreatedAtUtc
                )
                VALUES
                (
                    '44444444-4444-4444-4444-444444444444',
                    'Premium',
                    'Premium',
                    'Enterprise',
                    8299.00,
                    'Complete solution for large networks with advanced communication and reservation needs.',
                    0,
                    'Select Premium',
                    365,
                    1,
                    GETUTCDATE()
                );
            END
            """);

            return sql.ToString();
        }
    }
}
