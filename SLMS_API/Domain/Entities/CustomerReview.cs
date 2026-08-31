namespace SLMS_API.Domain.Entities;

public class CustomerReview
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public string? Role { get; set; }
    public int Rating { get; set; } = 5;
    public string? Title { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
    public string Status { get; set; } = "Pending"; // "Pending", "Approved", "Rejected"
    public bool IsApproved { get; set; } = false;
    public string? AdminRemarks { get; set; }
    public string? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime? RejectedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; } = false;
}
