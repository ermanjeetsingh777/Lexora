namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class LibraryListViewResponse
{
    public LibraryListSummaryResponse Summary { get; set; } = new();
    public IReadOnlyCollection<LibraryListItemResponse> Items { get; set; } = [];
    public LibraryListInsightResponse? TopPerformer { get; set; }
    public IReadOnlyCollection<LibraryListInsightResponse> NeedsAttention { get; set; } = [];
}

public class LibraryListSummaryResponse
{
    public int TotalLibraries { get; set; }
    public int ActiveLibraries { get; set; }
    public int TotalCapacity { get; set; }
    public int TotalOccupied { get; set; }
    public decimal AverageOccupancyPercent { get; set; }
    public int NearCapacityCount { get; set; }
    public int BranchCount { get; set; }
    public decimal RevenueMtd { get; set; }
    public decimal RevenuePreviousMtd { get; set; }
    public decimal RevenueMonthly { get; set; }
    public decimal RevenueQuarterly { get; set; }
    public decimal RevenueYearly { get; set; }
    public decimal RevenueAllTime { get; set; }
}

public class LibraryListItemResponse
{
    public Guid Id { get; set; }
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public int? Floor { get; set; }
    public int Capacity { get; set; }
    public int MemberCount { get; set; }
    public decimal OccupancyPercent { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? HoursStart { get; set; }
    public string? HoursEnd { get; set; }
}

public class LibraryListInsightResponse
{
    public Guid LibraryId { get; set; }
    public Guid BranchId { get; set; }
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public int? Floor { get; set; }
    public decimal OccupancyPercent { get; set; }
    public int MemberCount { get; set; }
    public int Capacity { get; set; }
}
