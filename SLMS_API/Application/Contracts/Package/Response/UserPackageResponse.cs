namespace SLMS_API.Application.Contracts.Package.Response
{
    public class UserPackageResponse
    {
        public Guid Id { get; set; }

        public string UserId { get; set; } = string.Empty;

        public Guid PackageId { get; set; }

        public string PackageName { get; set; } = string.Empty;

        public decimal Price { get; set; }

        public DateTime StartDateUtc { get; set; }

        public DateTime EndDateUtc { get; set; }

        public bool IsCurrentPackage { get; set; }

        public bool AutoRenew { get; set; }

        public bool IsActive { get; set; }

        public string PaymentStatus { get; set; } = string.Empty;

        public string ApprovalStatus { get; set; } = "Approved";

        public string? AdminRemarks { get; set; }

        public string? RequestType { get; set; }

        public decimal? FinalApprovedAmount { get; set; }
    }
}
