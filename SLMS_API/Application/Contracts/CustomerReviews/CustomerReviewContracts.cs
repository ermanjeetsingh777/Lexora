using System.ComponentModel.DataAnnotations;

namespace SLMS_API.Application.Contracts.CustomerReviews;

public class CreateCustomerReviewRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [StringLength(150)]
    public string? OrganizationName { get; set; }

    [StringLength(100)]
    public string? Role { get; set; }

    [Range(1, 5)]
    public int Rating { get; set; } = 5;

    [StringLength(200)]
    public string? Title { get; set; }

    [Required]
    [StringLength(2000, MinimumLength = 5)]
    public string Comment { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Suggestion { get; set; }
}

public class CustomerReviewResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public string? Role { get; set; }
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public string? AdminRemarks { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class PublicCustomerReviewResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public string? Role { get; set; }
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class ApproveCustomerReviewRequest
{
    [StringLength(1000)]
    public string? AdminRemarks { get; set; }
}

public class RejectCustomerReviewRequest
{
    [StringLength(1000)]
    public string? AdminRemarks { get; set; }
}
