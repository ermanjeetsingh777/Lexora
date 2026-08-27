using SLMS_API.Application.Contracts.Admin.Responses;
using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Auth.Responses;

public class UserProfileResponse
{
    public string Id { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? UserName { get; set; }
    public string? FullName { get; set; }
    public bool IsActive { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public UserType UserType { get; set; }
    public OnboardingStep OnboardingStep { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public IReadOnlyCollection<string> Roles { get; set; } = [];
    public IReadOnlyCollection<PermissionKey> Permissions { get; set; } = [];
    public IReadOnlyCollection<UserPermissionDetailResponse> PermissionDetails { get; set; } = [];
    public AdminUserAccessScopeResponse AccessScope { get; set; } = new();
    public UserAccessSummaryResponse AccessSummary { get; set; } = new();
}

public class UserPermissionDetailResponse
{
    public PermissionKey Key { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class UserAccessSummaryResponse
{
    public int InstitutionCount { get; set; }
    public int BranchCount { get; set; }
    public int LibraryCount { get; set; }
    public bool IsPlatformWide { get; set; }
}
