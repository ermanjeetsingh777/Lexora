namespace SLMS_API.Common.Constants;

public static class RoleDefinitions
{
    public const string SuperAdmin = "SuperAdmin";
    public const string OrganisationAdmin = "OrganisationAdmin";
    public const string OrganisationManager = "OrganisationManager";
    public const string InstitutionAdmin = "InstitutionAdmin";
    public const string InstitutionManager = "InstitutionManager";
    public const string BranchAdmin = "BranchAdmin";
    public const string BranchManager = "BranchManager";
    public const string LibrarianAdmin = "LibrarianAdmin";
    public const string LibrarianManager = "LibrarianManager";
    public const string Librarians = "Librarians";
    public const string Teachers = "Teachers";
    public const string Members = "Members";

    public static readonly IReadOnlyList<string> All =
    [
        SuperAdmin,
        OrganisationAdmin,
        OrganisationManager,
        InstitutionAdmin,
        InstitutionManager,
        BranchAdmin,
        BranchManager,
        LibrarianAdmin,
        LibrarianManager,
        Librarians,
        Teachers,
        Members
    ];
}
