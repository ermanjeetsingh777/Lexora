namespace SLMS_API.Application.Contracts.Organizations.Queries;

public class LibraryListQuery
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? InstitutionId { get; set; }
    public string? BranchId { get; set; }
}
