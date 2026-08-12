namespace SLMS_API.Domain.Entities
{
    public class PackageFeatures
    {
        public Guid Id { get; set; }

        public Guid PackageId { get; set; }

        public string FeatureName { get; set; } = string.Empty;

        public string? FeatureValue { get; set; }

        public Package Package { get; set; } = null!;
    }
}
