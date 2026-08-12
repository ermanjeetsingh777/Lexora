namespace SLMS_API.Application.Contracts.Organizations.Queries;

public class InstitutionListQuery
{
    public string? Search { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
}
