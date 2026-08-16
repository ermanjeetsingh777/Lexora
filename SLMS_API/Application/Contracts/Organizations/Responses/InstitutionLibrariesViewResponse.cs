namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionLibrariesViewResponse
{
    public Guid InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;

    public InstitutionLibrarySummaryResponse Summary { get; set; } = new();
    public IReadOnlyCollection<InstitutionLibraryCardResponse> Libraries { get; set; } = [];
}

public class InstitutionLibrarySummaryResponse
{
    public int TotalLibraries { get; set; }
    public int ActiveLibraries { get; set; }
    public int TotalCapacity { get; set; }
    public decimal AverageOccupancyPercent { get; set; }
}

public class InstitutionLibraryCardResponse
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string? City { get; set; }
    public int? Floor { get; set; }
    public int Capacity { get; set; }
    public int MemberCount { get; set; }
    public decimal OccupancyPercent { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
