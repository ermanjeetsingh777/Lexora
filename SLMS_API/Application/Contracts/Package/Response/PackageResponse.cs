namespace SLMS_API.Application.Contracts.Package.Response
{
    public class PackageResponse
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Code { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public int DurationInDays { get; set; }

        public bool IsActive { get; set; }

        public bool IsPopular { get; set; }

        public string? CtaLabel { get; set; }

        public List<PackageFeatureResponse> Features { get; set; } = [];
    }
}
