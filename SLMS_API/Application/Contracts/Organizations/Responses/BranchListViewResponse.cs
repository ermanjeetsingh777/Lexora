namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class BranchListViewResponse
{
    public BranchListSummaryResponse Summary { get; set; } = new();
    public IReadOnlyCollection<BranchListItemResponse> Items { get; set; } = [];
    public BranchListInsightResponse? TopPerformer { get; set; }
    public IReadOnlyCollection<BranchListInsightResponse> NeedsAttention { get; set; } = [];
}

public class BranchListSummaryResponse
{
    public int TotalBranches { get; set; }
    public int ActiveBranches { get; set; }
    public int TotalCapacity { get; set; }
    public int TotalOccupied { get; set; }
    public decimal AverageOccupancyPercent { get; set; }
    public int NearCapacityCount { get; set; }
    public int TotalLibraries { get; set; }
    public int CityCount { get; set; }
    public decimal RevenueMtd { get; set; }
    public decimal RevenuePreviousMtd { get; set; }
    public decimal RevenueMonthly { get; set; }
    public decimal RevenueQuarterly { get; set; }
    public decimal RevenueYearly { get; set; }
    public decimal RevenueAllTime { get; set; }
}

public class BranchListItemResponse
{
    public Guid Id { get; set; }
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Contact { get; set; }
    public int Capacity { get; set; }
    public int MemberCount { get; set; }
    public decimal OccupancyPercent { get; set; }
    public int LibraryCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? HoursStart { get; set; }
    public string? HoursEnd { get; set; }
}

public class BranchListInsightResponse
{
    public Guid BranchId { get; set; }
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public decimal OccupancyPercent { get; set; }
    public int MemberCount { get; set; }
    public int LibraryCount { get; set; }
    public int Capacity { get; set; }
}
