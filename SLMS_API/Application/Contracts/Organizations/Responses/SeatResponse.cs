namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class SeatResponse
{
    public Guid Id { get; set; }
    public Guid LibraryId { get; set; }
    public string LibraryName { get; set; } = string.Empty;
    public string? SeatNumber { get; set; }
    public string? SeatType { get; set; }
    /// <summary>Available | Occupied | Inactive</summary>
    public string? Status { get; set; }
    public Guid? AssignedMemberId { get; set; }
    public string? AssignedMemberName { get; set; }
}
