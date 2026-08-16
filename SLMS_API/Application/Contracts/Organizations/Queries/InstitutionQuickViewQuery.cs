namespace SLMS_API.Application.Contracts.Organizations.Queries;

public class InstitutionQuickViewQuery
{
    public string? Metric { get; set; }
    public int Range { get; set; } = 14;
}
