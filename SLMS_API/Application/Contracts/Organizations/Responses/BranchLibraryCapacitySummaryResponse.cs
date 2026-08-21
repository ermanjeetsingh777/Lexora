namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class BranchLibraryCapacitySummaryResponse
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int BranchCapacity { get; set; }
    public int AllocatedCapacity { get; set; }
    public int RemainingCapacity { get; set; }
    public bool HasBranchCapacityLimit { get; set; }
    public string? BranchHoursStart { get; set; }
    public string? BranchHoursEnd { get; set; }
    public IReadOnlyCollection<BranchLibraryCapacityItemResponse> Libraries { get; set; } = [];
}

public class BranchLibraryCapacityItemResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? Floor { get; set; }
    public int Capacity { get; set; }
}
