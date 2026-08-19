namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class BranchDetailViewResponse
{
    public Guid Id { get; set; }
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? City { get; set; }
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? ManagerName { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? HoursStart { get; set; }
    public string? HoursEnd { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }

    public int Capacity { get; set; }
    public int MemberCount { get; set; }
    public decimal OccupancyPercent { get; set; }
    public int LibraryCount { get; set; }
    public int AvgFootfallPerDay { get; set; }

    public decimal RevenueMtd { get; set; }
    public decimal RevenuePreviousMtd { get; set; }
    public decimal RevenueMonthly { get; set; }
    public decimal RevenueQuarterly { get; set; }
    public decimal RevenueYearly { get; set; }
    public decimal RevenueAllTime { get; set; }

    public IReadOnlyCollection<InstitutionTrendPointResponse> OccupancyTrend { get; set; } = [];
    public IReadOnlyCollection<InstitutionAttendanceDayResponse> AttendanceTrend { get; set; } = [];
    public InstitutionOccupancyHeatmapResponse OccupancyHeatmap { get; set; } = new();
    public IReadOnlyCollection<BranchPeakHourResponse> PeakHours { get; set; } = [];
    public IReadOnlyCollection<BranchFootfallDayResponse> FootfallByShift { get; set; } = [];

    public IReadOnlyCollection<InstitutionLibraryCardResponse> Libraries { get; set; } = [];
    public IReadOnlyCollection<BranchStaffMemberResponse> Staff { get; set; } = [];
    public IReadOnlyCollection<BranchActivityItemResponse> Activity { get; set; } = [];
}

public class BranchPeakHourResponse
{
    public string Hour { get; set; } = string.Empty;
    public int CheckIns { get; set; }
}

public class BranchFootfallDayResponse
{
    public string Day { get; set; } = string.Empty;
    public int Morning { get; set; }
    public int Afternoon { get; set; }
    public int Evening { get; set; }
    public int Night { get; set; }
}

public class BranchStaffMemberResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimary { get; set; }
}

public class BranchActivityItemResponse
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
}
