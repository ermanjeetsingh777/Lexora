using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Auth.Requests;

public class RegisterAddonItem
{
    public Guid AddonId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
    public string? Name { get; set; }
    public Guid PackageId { get; set; }
    public UserType UserType { get; set; } = UserType.Member;
    public List<RegisterAddonItem> SelectedAddons { get; set; } = [];
    /// <summary>
    /// How the workspace is created: automatically, through the onboarding wizard,
    /// or later after SuperAdmin approval.
    /// </summary>
    public WorkspaceSetupMode SetupMode { get; set; } = WorkspaceSetupMode.Auto;

    /// <summary>Used with <see cref="WorkspaceSetupMode.Auto"/>; empty falls back to "{Name} Main".</summary>
    public string? InstitutionName { get; set; }
    public string? BranchName { get; set; }
    public string? LibraryName { get; set; }
}
