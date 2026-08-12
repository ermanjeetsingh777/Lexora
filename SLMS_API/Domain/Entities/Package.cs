namespace SLMS_API.Domain.Entities
{
    public class Package
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int DurationInDays { get; set; }
        public string? Description { get; set; }
        public bool IsPopular { get; set; } = true;
        public bool IsActive { get; set; } = true;
        public string? CtaLabel { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public ICollection<PackageFeatures> Features { get; set; } = new List<PackageFeatures>();
        public ICollection<UserPackage> UserPackages { get; set; } = new List<UserPackage>();
    }
}
