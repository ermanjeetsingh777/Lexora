namespace SLMS_API.Domain.Entities
{
    public class Addon
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string ResourceType { get; set; } = "Library"; // Institution, Branch, Library, User, Member
        public int UnitQuantity { get; set; } = 1;
        public decimal Price { get; set; }
        public int DurationInDays { get; set; } = 365;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }

        public ICollection<UserPackageAddon> UserPackageAddons { get; set; } = new List<UserPackageAddon>();
    }
}
