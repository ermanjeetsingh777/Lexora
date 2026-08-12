namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class OrganizationAnalyticsResponse
{
    public int BranchCount { get; set; }
    public int LibraryCount { get; set; }
    public int ActiveBranchCount { get; set; }
    public int ActiveLibraryCount { get; set; }
}
