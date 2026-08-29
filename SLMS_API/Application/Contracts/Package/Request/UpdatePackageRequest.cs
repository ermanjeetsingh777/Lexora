using System.ComponentModel.DataAnnotations;

namespace SLMS_API.Application.Contracts.Package.Request
{
    public class UpdatePackageRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Code { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(1, 3650)]
        public int DurationInDays { get; set; }

        public bool IsActive { get; set; }

        public bool IsPopular { get; set; }

        [MaxLength(100)]
        public string? CtaLabel { get; set; }

        public int MaxInstitutions { get; set; } = 1;
        public int MaxBranches { get; set; } = 1;
        public int MaxLibraries { get; set; } = 1;
        public int MaxUsers { get; set; } = 2;
        public int MaxMembers { get; set; } = 200;

        public List<CreatePackageFeatureRequest> Features { get; set; } = [];
    }
}
