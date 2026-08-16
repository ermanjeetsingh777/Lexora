namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionListViewResponse
{
    public InstitutionListSummaryResponse Summary { get; set; } = new();
    public IReadOnlyCollection<InstitutionCardResponse> Items { get; set; } = [];
}

public class InstitutionListSummaryResponse
{
    public int TotalInstitutions { get; set; }
    public int TotalBranches { get; set; }
    public int TotalLibraries { get; set; }
    public int TotalMembers { get; set; }
    public decimal RevenueMtd { get; set; }
    public decimal RevenuePreviousMtd { get; set; }
    public decimal RevenueMonthly { get; set; }
    public decimal RevenueQuarterly { get; set; }
    public decimal RevenueYearly { get; set; }
    public decimal RevenueAllTime { get; set; }
    public decimal AverageOccupancyPercent { get; set; }
}

public class InstitutionCardResponse
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = string.Empty;
    public int UpdateCount { get; set; }
    public decimal OccupancyPercent { get; set; }
    public int BranchCount { get; set; }
    public int MemberCount { get; set; }
    public decimal Revenue { get; set; }
    public string HealthStatus { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; }
}
