using SLMS_API.Application.Contracts.Addon;

namespace SLMS_API.Application.Contracts.Package.Response;

public class OrganizationEntitlementsResponse
{
    public string? PackageCode { get; set; }

    public string? PackageName { get; set; }

    /// <summary>Basic | Value | Premium | Trial</summary>
    public string PackageTier { get; set; } = "Basic";

    public bool IsSuperAdmin { get; set; }

    // Institutions
    public int InstitutionCount { get; set; }
    public int MaxInstitutions { get; set; } = 1;
    public bool CanCreateInstitution { get; set; }

    // Branches
    public int BranchCount { get; set; }
    public int MaxBranches { get; set; } = 1;
    public bool CanCreateBranch { get; set; }

    // Libraries
    public int LibraryCount { get; set; }
    public int MaxLibraries { get; set; } = 1;
    public bool CanCreateLibrary { get; set; }

    // Users (Active only)
    public int UserCount { get; set; }
    public int MaxUsers { get; set; } = 2;
    public bool CanCreateUser { get; set; }

    // Members (Active only)
    public int MemberCount { get; set; }
    public int MaxMembers { get; set; } = 200;
    public bool CanCreateMember { get; set; }

    // Active Addons Summary
    public List<UserAddonResponse> ActiveAddons { get; set; } = [];
}
