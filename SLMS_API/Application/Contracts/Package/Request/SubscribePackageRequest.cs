using System.ComponentModel.DataAnnotations;

namespace SLMS_API.Application.Contracts.Package.Request
{
    public class SubscribePackageRequest
    {
        [Required]
        public Guid PackageId { get; set; }

        public bool AutoRenew { get; set; }
    }
}
