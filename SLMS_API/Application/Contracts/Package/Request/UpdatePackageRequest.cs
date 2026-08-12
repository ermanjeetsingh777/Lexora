using System.ComponentModel.DataAnnotations;

namespace SLMS_API.Application.Contracts.Package.Request
{
    public class UpdatePackageRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(1, 3650)]
        public int DurationInDays { get; set; }

        public bool IsActive { get; set; }

        public List<CreatePackageFeatureRequest> Features { get; set; } = [];
    }
}
