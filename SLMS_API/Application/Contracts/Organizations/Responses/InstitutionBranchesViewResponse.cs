namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionBranchesViewResponse
{
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Location { get; set; }

    public InstitutionBranchSummaryResponse Summary { get; set; } = new();
    public IReadOnlyCollection<InstitutionBranchCardResponse> Branches { get; set; } = [];
    public InstitutionBranchInsightResponse? TopPerformer { get; set; }
    public IReadOnlyCollection<InstitutionBranchInsightResponse> NeedsAttention { get; set; } = [];
}

public class InstitutionBranchSummaryResponse
{
    public int TotalBranches { get; set; }
    public int ActiveBranches { get; set; }
    public int TotalCapacity { get; set; }
    public decimal AverageOccupancyPercent { get; set; }
    public int NearCapacityCount { get; set; }
}

public class InstitutionBranchCardResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Contact { get; set; }
    public int Capacity { get; set; }
    public decimal OccupancyPercent { get; set; }
    public int LibraryCount { get; set; }
    public int MemberCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class InstitutionBranchInsightResponse
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public decimal OccupancyPercent { get; set; }
    public int MemberCount { get; set; }
    public int LibraryCount { get; set; }
    public int Capacity { get; set; }
}
