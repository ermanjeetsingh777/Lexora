using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Admin;

public class TenantRegistrationAddonItem
{
    public Guid AddonId { get; set; }
    public string AddonName { get; set; } = string.Empty;
    public string AddonCode { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public int UnitQuantity { get; set; } = 1;
    public int TotalExtraQuantity { get; set; } = 1;
    public decimal AmountPaid { get; set; }
    public bool IsActive { get; set; }
}

public class TenantRegistrationResponse
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime RegisteredAtUtc { get; set; }
    public OnboardingStep OnboardingStep { get; set; }
    public string ApprovalStatus { get; set; } = "Pending"; // "Pending", "Approved", "Rejected"
    public string? AdminRemarks { get; set; }
    public decimal? FinalApprovedAmount { get; set; }
    public decimal TotalCalculatedAmount { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime? RejectedAtUtc { get; set; }
    public string? ApprovedBy { get; set; }
    public bool IsActive { get; set; }

    // Package Details
    public Guid? PackageId { get; set; }
    public string? PackageName { get; set; }
    public string? PackageCode { get; set; }
    public string? PackageTier { get; set; }
    public decimal PackagePrice { get; set; }
    public int DurationInDays { get; set; }

    // Addons
    public List<TenantRegistrationAddonItem> Addons { get; set; } = [];

    // Organization Nodes (created in onboarding)
    public Guid? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public string? InstitutionCode { get; set; }
    public string? InstitutionContactEmail { get; set; }
    public string? InstitutionContactPhone { get; set; }

    public Guid? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string? BranchCity { get; set; }

    public Guid? LibraryId { get; set; }
    public string? LibraryName { get; set; }
    public int? LibraryCapacity { get; set; }
}

public class ApproveTenantRegistrationRequest
{
    public decimal? FinalAmount { get; set; }
    public string? Remarks { get; set; }
}

public class RejectTenantRegistrationRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SuperAdminContactInfo
{
    public string Email { get; set; } = "er.yogeshrao@gmail.com";
    public string Phone { get; set; } = "+91 9992823909";
    public string SecondaryPhone { get; set; } = "+91 9468118737";
    public string WhatsApp { get; set; } = "+91 9992823909";
    public string WhatsAppUrl { get; set; } = "https://wa.me/919992823909";
    public string Availability { get; set; } = "Instant Verification & Activation Support (9:00 AM - 9:00 PM IST)";
}

public class TenantRegistrationStatusResponse
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public OnboardingStep OnboardingStep { get; set; }
    public string ApprovalStatus { get; set; } = "Pending";
    public string? AdminRemarks { get; set; }
    public decimal? FinalApprovedAmount { get; set; }
    public decimal TotalCalculatedAmount { get; set; }
    public DateTime RegisteredAtUtc { get; set; }

    public string? PackageName { get; set; }
    public string? PackageTier { get; set; }
    public decimal PackagePrice { get; set; }

    public List<TenantRegistrationAddonItem> Addons { get; set; } = [];

    public string? InstitutionName { get; set; }
    public string? BranchName { get; set; }
    public string? LibraryName { get; set; }

    public SuperAdminContactInfo SuperAdminContact { get; set; } = new();
}
