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

        // Dynamic Quotas
        public int MaxInstitutions { get; set; } = 1;
        public int MaxBranches { get; set; } = 1;
        public int MaxLibraries { get; set; } = 1;
        public int MaxUsers { get; set; } = 2;
        public int MaxMembers { get; set; } = 200;

        public List<PackageFeatureResponse> Features { get; set; } = [];
    }
}
