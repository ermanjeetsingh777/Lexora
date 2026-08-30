using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Application.Contracts.Auth.Responses;

public class CurrentUserResponse
{
    public string Id { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? UserName { get; set; }
    public string? FullName { get; set; }
    public bool IsActive { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public UserType UserType { get; set; }
    public OnboardingStep OnboardingStep { get; set; }
    public string ApprovalStatus { get; set; } = "Pending";
    public string? AdminRemarks { get; set; }
    public decimal? FinalApprovedAmount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public IReadOnlyCollection<string> Roles { get; set; } = [];
    public IReadOnlyCollection<PermissionKey> Permissions { get; set; } = [];
}
