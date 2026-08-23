using SLMS_API.Application.Contracts.Package.Response;

namespace SLMS_API.Application.Contracts.PackageSubscription;

public class PackageSubscriptionOverviewResponse
{
    public bool IsSuperAdmin { get; set; }

    public PackageSubscriptionSummaryResponse Summary { get; set; } = new();

    public PackageSubscriptionItemResponse? CurrentSubscription { get; set; }

    public IReadOnlyList<PackageSubscriptionItemResponse> ActiveSubscriptions { get; set; } = [];

    public IReadOnlyList<PackageSubscriptionItemResponse> ExpiringSoon { get; set; } = [];

    public IReadOnlyList<PackageSubscriptionItemResponse> Expired { get; set; } = [];

    public IReadOnlyList<PackageSubscriptionHistoryItemResponse> History { get; set; } = [];

    public IReadOnlyList<PackageResponse> AvailablePackages { get; set; } = [];
}

public class PackageSubscriptionSummaryResponse
{
    public int TotalActive { get; set; }

    public int ExpiringSoonCount { get; set; }

    public int ExpiredCount { get; set; }

    public decimal TotalRevenue { get; set; }
}

public class PackageSubscriptionItemResponse
{
    public Guid Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string UserEmail { get; set; } = string.Empty;

    public Guid? InstitutionId { get; set; }

    public string? InstitutionName { get; set; }

    public Guid PackageId { get; set; }

    public string PackageName { get; set; } = string.Empty;

    public string PackageCode { get; set; } = string.Empty;

    public string? PackageCategory { get; set; }

    public decimal PackagePrice { get; set; }

    public decimal AmountPaid { get; set; }

    public decimal AdjustmentAmount { get; set; }

    public int DurationInDays { get; set; }

    public DateTime StartDateUtc { get; set; }

    public DateTime EndDateUtc { get; set; }

    public bool AutoRenew { get; set; }

    public bool IsCurrentPackage { get; set; }

    public bool IsActive { get; set; }

    public string PaymentStatus { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int DaysRemaining { get; set; }

    public bool CanRenew { get; set; }

    public bool CanUpgrade { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public List<PackageFeatureResponse> Features { get; set; } = [];
}

public class PackageSubscriptionHistoryItemResponse : PackageSubscriptionItemResponse
{
    public string Action { get; set; } = string.Empty;
}

public class RenewPackageSubscriptionRequest
{
    public Guid? SubscriptionId { get; set; }

    public Guid? PackageId { get; set; }

    public bool? AutoRenew { get; set; }

    public decimal? AmountPaid { get; set; }

    public decimal? AdjustmentAmount { get; set; }

    public string? PaymentStatus { get; set; }
}

public class UpdatePackageSubscriptionRequest
{
    public Guid? PackageId { get; set; }

    public DateTime? EndDateUtc { get; set; }

    public decimal? AmountPaid { get; set; }

    public decimal? AdjustmentAmount { get; set; }

    public bool? AutoRenew { get; set; }

    public string? PaymentStatus { get; set; }
}

public class PackageSubscriptionQuoteResponse
{
    public Guid SubscriptionId { get; set; }

    public Guid PackageId { get; set; }

    public string PackageName { get; set; } = string.Empty;

    public decimal PackagePrice { get; set; }

    public decimal AdjustmentAmount { get; set; }

    public decimal AmountPaid { get; set; }

    public int RemainingDays { get; set; }

    public bool IsExpired { get; set; }

    public string CurrentPackageName { get; set; } = string.Empty;
}
