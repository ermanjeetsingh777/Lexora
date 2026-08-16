namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionOverviewResponse
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }

    public int ActiveBranchCount { get; set; }
    public int TotalLibraryCount { get; set; }
    public int EnrolledMemberCount { get; set; }
    public int OccupiedSeats { get; set; }
    public int TotalSeats { get; set; }
    public decimal OccupancyPercent { get; set; }

    public InstitutionCapacityUtilizationResponse CapacityUtilization { get; set; } = new();
    public InstitutionMemberMixResponse MemberMix { get; set; } = new();

    public decimal RevenueMtd { get; set; }
    public decimal RevenuePreviousMtd { get; set; }
    public decimal RevenueMonthly { get; set; }
    public decimal RevenueQuarterly { get; set; }
    public decimal RevenueYearly { get; set; }
    public decimal RevenueAllTime { get; set; }
    public IReadOnlyCollection<InstitutionRevenueDayResponse> RevenueTrend { get; set; } = [];
    public IReadOnlyCollection<InstitutionTrendPointResponse> OccupancyTrend { get; set; } = [];
    public IReadOnlyCollection<InstitutionAttendanceDayResponse> AttendanceTrend { get; set; } = [];
    public InstitutionOccupancyHeatmapResponse OccupancyHeatmap { get; set; } = new();
}

public class InstitutionCapacityUtilizationResponse
{
    public int TotalSeats { get; set; }
    public int CurrentMembers { get; set; }
    public int TotalLibraries { get; set; }
}

public class InstitutionMemberMixResponse
{
    public int Active { get; set; }
    public int Inactive { get; set; }
    public int Suspended { get; set; }
}
