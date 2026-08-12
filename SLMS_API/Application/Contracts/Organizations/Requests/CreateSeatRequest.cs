namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class CreateSeatRequest
{
    public string? SeatNumber { get; set; }
    public string? SeatType { get; set; }
    public Guid? SectionId { get; set; }
}
