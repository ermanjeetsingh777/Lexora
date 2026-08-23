using System.ComponentModel.DataAnnotations;

namespace SLMS_API.Application.Contracts.Package.Request
{
    public class UpgradePackageRequest
    {
        public Guid? SubscriptionId { get; set; }

        [Required]
        public Guid NewPackageId { get; set; }

        public bool AutoRenew { get; set; }
    }
}
