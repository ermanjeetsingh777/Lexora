namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class LibraryDetailViewResponse
{
    public Guid Id { get; set; }
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string? City { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public int? Floor { get; set; }
    public int Capacity { get; set; }
    public int MemberCount { get; set; }
    public int CheckedInToday { get; set; }
    public decimal OccupancyPercent { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? HoursStart { get; set; }
    public string? HoursEnd { get; set; }
    public string? BranchHoursStart { get; set; }
    public string? BranchHoursEnd { get; set; }
    public string? PeakHourStart { get; set; }
    public string? PeakHourEnd { get; set; }
    public IReadOnlyCollection<InstitutionTrendPointResponse> OccupancyTrend { get; set; } = [];
    public IReadOnlyCollection<LibraryFloorBreakdownResponse> FloorBreakdown { get; set; } = [];
    public IReadOnlyCollection<LibraryDayHoursResponse> WeeklyHours { get; set; } = [];
    public IReadOnlyCollection<LibraryHoursExceptionResponse> HoursExceptions { get; set; } = [];
    public IReadOnlyCollection<LibraryDetailSeatResponse> Seats { get; set; } = [];
    public IReadOnlyCollection<LibrarySectionSummaryResponse> Sections { get; set; } = [];
    public IReadOnlyCollection<LibraryActivityItemResponse> RecentActivity { get; set; } = [];
}

public class LibraryFloorBreakdownResponse
{
    public int Floor { get; set; }
    public int Libraries { get; set; }
    public int Capacity { get; set; }
    public int Occupied { get; set; }
}

public class LibraryDayHoursResponse
{
    public string Day { get; set; } = string.Empty;
    public bool Closed { get; set; }
    public string? Open { get; set; }
    public string? Close { get; set; }
}

public class LibraryHoursExceptionResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public bool Closed { get; set; }
    public string? Open { get; set; }
    public string? Close { get; set; }
}

public class LibraryDetailSeatResponse
{
    public Guid Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public int Row { get; set; }
    public int Col { get; set; }
    public string Section { get; set; } = string.Empty;
    public int Floor { get; set; }
    public string Status { get; set; } = "available";
    public string Type { get; set; } = "Standard";
    public string? MemberName { get; set; }
    public int TodaySessionCount { get; set; }
    public IReadOnlyCollection<LibrarySeatSessionResponse> TodaySessions { get; set; } = [];
}

public class LibrarySeatSessionResponse
{
    public string MemberName { get; set; } = string.Empty;
    public string? MembershipNo { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public bool IsActive { get; set; }
}

public class LibrarySectionSummaryResponse
{
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public int Occupied { get; set; }
}

public class LibraryActivityItemResponse
{
    public string Id { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
}
