namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class SeatResponse
{
    public Guid Id { get; set; }
    public string? SeatNumber { get; set; }
    public string? SeatType { get; set; }
    public string? Status { get; set; }
}
