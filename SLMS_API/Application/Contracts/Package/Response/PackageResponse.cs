namespace SLMS_API.Application.Contracts.Package.Response
{
    public class PackageResponse
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public int DurationInDays { get; set; }

        public bool IsActive { get; set; }

        public List<PackageFeatureResponse> Features { get; set; } = [];
    }
}
