namespace SLMS_API.Application.Contracts.Package.Response;

public class OrganizationEntitlementsResponse
{
    public string? PackageCode { get; set; }

    public string? PackageName { get; set; }

    /// <summary>Basic | Value | Premium</summary>
    public string PackageTier { get; set; } = "Basic";

    public int InstitutionCount { get; set; }

    public int BranchCount { get; set; }

    public int LibraryCount { get; set; }

    public bool IsSuperAdmin { get; set; }

    public bool CanCreateInstitution { get; set; }

    public bool CanCreateBranch { get; set; }

    public bool CanCreateLibrary { get; set; }
}
