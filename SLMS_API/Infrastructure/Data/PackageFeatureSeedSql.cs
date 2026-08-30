using System.Text;

namespace SLMS_API.Infrastructure.Data
{
    public static class PackageFeatureSeedSql
    {
        public static string GetSeedSql()
        {
            var sql = new StringBuilder();

            sql.AppendLine("""
            DELETE FROM PackageFeatures WHERE PackageId IN (
                '11111111-1111-1111-1111-111111111111',
                '22222222-2222-2222-2222-222222222222',
                '33333333-3333-3333-3333-333333333333',
                '44444444-4444-4444-4444-444444444444'
            );

            INSERT INTO PackageFeatures (Id, PackageId, FeatureName, FeatureValue)
            VALUES
            -- Branches & libraries
            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Single Institution & Branch', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Single Institution & Branch', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Single Institution & Branch', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Single Institution & Branch', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Multi-Institution Management', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Multi-Institution Management', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Multi-Institution Management', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Multi-Institution Management', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Multi-Branch Management', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Multi-Branch Management', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Multi-Branch Management', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Multi-Branch Management', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Multi-Library Network', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Multi-Library Network', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Multi-Library Network', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Multi-Library Network', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Branch-level Reporting', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Branch-level Reporting', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Branch-level Reporting', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Branch-level Reporting', '0'),

            -- Members & billing
            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Member Management & Profiles', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Member Management & Profiles', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Member Management & Profiles', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Member Management & Profiles', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Membership Plans & Subscriptions', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Membership Plans & Subscriptions', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Membership Plans & Subscriptions', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Membership Plans & Subscriptions', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Fees & Payment Tracking', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Fees & Payment Tracking', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Fees & Payment Tracking', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Fees & Payment Tracking', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Late Fees Tracking & Penalties', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Late Fees Tracking & Penalties', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Late Fees Tracking & Penalties', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Late Fees Tracking & Penalties', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Member Attendance & QR Check-in', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Member Attendance & QR Check-in', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Member Attendance & QR Check-in', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Member Attendance & QR Check-in', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Seat Allocation & Shift Management', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Seat Allocation & Shift Management', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Seat Allocation & Shift Management', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Seat Allocation & Shift Management', '0'),

            -- Books & circulation
            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Book Catalog & Inventory', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Book Catalog & Inventory', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Book Catalog & Inventory', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Book Catalog & Inventory', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Book Issue & Return Circulation', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Book Issue & Return Circulation', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Book Issue & Return Circulation', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Book Issue & Return Circulation', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Book Audit & Barcode Scanning', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Book Audit & Barcode Scanning', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Book Audit & Barcode Scanning', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Book Audit & Barcode Scanning', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Book Reservations & Holds', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Book Reservations & Holds', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Book Reservations & Holds', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Book Reservations & Holds', '0'),

            -- Notifications
            (NEWID(), '11111111-1111-1111-1111-111111111111', 'WhatsApp Sharing & Receipts', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'WhatsApp Sharing & Receipts', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'WhatsApp Sharing & Receipts', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'WhatsApp Sharing & Receipts', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Automated Mail Notifications', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Automated Mail Notifications', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Automated Mail Notifications', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Automated Mail Notifications', '0'),

            -- Analytics & reports
            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Standard Reports & Exports', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Standard Reports & Exports', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Standard Reports & Exports', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Standard Reports & Exports', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Multi-Branch Comparative Dashboard', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Multi-Branch Comparative Dashboard', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Multi-Branch Comparative Dashboard', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Multi-Branch Comparative Dashboard', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Advanced Analytics & Insights', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Advanced Analytics & Insights', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Advanced Analytics & Insights', '1'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Advanced Analytics & Insights', '0'),

            -- Support & onboarding
            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Standard Support', '0'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Standard Support', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Standard Support', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Standard Support', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Priority 24/7 Dedicated Support', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Priority 24/7 Dedicated Support', '1'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Priority 24/7 Dedicated Support', '1'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Priority 24/7 Dedicated Support', '0'),

            (NEWID(), '11111111-1111-1111-1111-111111111111', 'Capacity Add-ons Compatibility', '1'),
            (NEWID(), '22222222-2222-2222-2222-222222222222', 'Capacity Add-ons Compatibility', '0'),
            (NEWID(), '33333333-3333-3333-3333-333333333333', 'Capacity Add-ons Compatibility', '0'),
            (NEWID(), '44444444-4444-4444-4444-444444444444', 'Capacity Add-ons Compatibility', '0');
            """);

            return sql.ToString();
        }
    }
}
