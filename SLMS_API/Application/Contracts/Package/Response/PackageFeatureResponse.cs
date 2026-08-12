namespace SLMS_API.Application.Contracts.Package.Response
{
    public class PackageFeatureResponse
    {
        public Guid Id { get; set; }

        public string FeatureName { get; set; } = string.Empty;

        public string? FeatureValue { get; set; }
    }
}
