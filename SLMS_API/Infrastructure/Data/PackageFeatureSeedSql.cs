using System.Text;

namespace SLMS_API.Infrastructure.Data
{
    public static class PackageFeatureSeedSql
    {
        public static string GetSeedSql()
        {
            var sql = new StringBuilder();

            sql.AppendLine("""
            INSERT INTO PackageFeatures (Id, PackageId, FeatureName, FeatureValue)
            SELECT v.Id, v.PackageId, v.FeatureName, v.FeatureValue
            FROM
            (
                VALUES
                ('5C816594-3318-456A-8899-023B8AED53C4','33333333-3333-3333-3333-333333333333','Multiple Library Branches','0'),
                ('B94B66A9-8FAD-4E43-823F-311EB70296DC','11111111-1111-1111-1111-111111111111','Fees Management','0'),
                ('03F10B2A-3E34-4145-BF04-3D1BD43B13CE','22222222-2222-2222-2222-222222222222','Late Fees Tracking','0'),
                ('9DE0209E-53D7-45B2-B049-3E2FFB719285','44444444-4444-4444-4444-444444444444','Member Management','0'),
                ('F95DFCC5-DD6D-4500-9F0A-45AC8D2391C5','33333333-3333-3333-3333-333333333333','No Book Reservations','1'),
                ('151D672F-4969-4BA4-8614-4C56CFA29E5F','22222222-2222-2222-2222-222222222222','No Book Reservations','1'),
                ('4CCC9C9A-4C46-4EB3-A171-52F1E28A12BA','33333333-3333-3333-3333-333333333333','Fees Management','0'),
                ('1F9685AF-0A97-4225-A04F-5B8695B17B80','33333333-3333-3333-3333-333333333333','No Mail Notifications','1'),
                ('44DBEDFF-B771-4BA2-BC62-66E992C1B93F','11111111-1111-1111-1111-111111111111','Advanced Analytics','0'),
                ('10633E03-8D10-4817-8F3B-6D13AA554FB2','11111111-1111-1111-1111-111111111111','14-day full access trial','0'),
                ('12660491-FC3F-46C0-8109-764964C1773F','11111111-1111-1111-1111-111111111111','Unlimited Libraries & Branches','0'),
                ('1E458A90-38B4-4629-A985-8BACEDE9C642','44444444-4444-4444-4444-444444444444','Mail Notifications','0'),
                ('BF577CE6-76DC-45C7-AC91-8D60C8D75B75','22222222-2222-2222-2222-222222222222','No Mail Notifications','1'),
                ('9FC57299-78DF-422B-AF51-A1AD0E671715','11111111-1111-1111-1111-111111111111','Priority Support','0'),
                ('995F7AF3-A891-4D7E-BC1C-B8F618796C2F','22222222-2222-2222-2222-222222222222','No Branch Support','1'),
                ('79B8FB35-9ACF-4C47-A82F-BA93FCF2BC6F','44444444-4444-4444-4444-444444444444','Advanced Analytics','0'),
                ('2BDDB01D-7CDD-47DD-ABCB-BC1142A88ECE','11111111-1111-1111-1111-111111111111','Book Reservations & Holds','0'),
                ('4F06B7CC-4F1E-40FF-BC85-C3E20B496730','22222222-2222-2222-2222-222222222222','Member Management','0'),
                ('2E06D4E1-9428-47E1-B545-D3F3A353D249','33333333-3333-3333-3333-333333333333','Member Management','0'),
                ('09683F9D-82D6-4841-BCC7-D41BEA4DB8C5','11111111-1111-1111-1111-111111111111','Late Fees Tracking','0'),
                ('313F34B4-0DF3-4D1D-B9DB-D7F38241D4A0','33333333-3333-3333-3333-333333333333','Branch-level Reporting','0'),
                ('0DEEDC76-DC44-4ED1-8A28-DAAE6AA0A0F5','44444444-4444-4444-4444-444444444444','Unlimited Libraries & Branches','0'),
                ('704ADBA0-85D6-45DE-822E-DD42B9C84CC8','11111111-1111-1111-1111-111111111111','Mail Notifications','0'),
                ('C7FFD808-F85E-4D61-B6E4-DD86206D9845','44444444-4444-4444-4444-444444444444','Priority Support','0'),
                ('4C7F6CDE-FAA4-4A99-95E3-E2966C8A95AE','22222222-2222-2222-2222-222222222222','Fees Management','0'),
                ('78FE35A5-4670-4207-A9F8-E6DDEFD32935','44444444-4444-4444-4444-444444444444','Book Reservations & Holds','0'),
                ('9B95CE61-D971-4958-ADEA-EDEE0D4760E7','22222222-2222-2222-2222-222222222222','1 Library','0'),
                ('827C95BA-11B0-4A93-9448-EE04403D9E99','33333333-3333-3333-3333-333333333333','Late Fees Tracking','0'),
                ('59F4A034-7DC0-4F39-9536-F07CF031C9AA','44444444-4444-4444-4444-444444444444','Fees Management','0'),
                ('073AD629-83AA-41DC-A20A-FA9AB11DC4D3','11111111-1111-1111-1111-111111111111','Member Management','0'),
                ('47077EA7-1840-40A0-9DD2-FC4374BBABB0','44444444-4444-4444-4444-444444444444','Late Fees Tracking','0')
            ) AS v(Id, PackageId, FeatureName, FeatureValue)
            WHERE NOT EXISTS
            (
                SELECT 1
                FROM PackageFeatures pf
                WHERE pf.Id = v.Id
            );
            """);

            return sql.ToString();
        }
    }
}
