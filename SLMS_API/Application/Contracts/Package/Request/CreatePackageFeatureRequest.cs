using System.ComponentModel.DataAnnotations;

namespace SLMS_API.Application.Contracts.Package.Request
{
    public class CreatePackageFeatureRequest
    {
        [Required]
        [MaxLength(150)]
        public string FeatureName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? FeatureValue { get; set; }
    }
}
