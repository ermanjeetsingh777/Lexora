namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class CheckOutRequest
{
    public Guid MemberId { get; set; }
    public string? SeatNumber { get; set; }
    public string? DeviceId { get; set; }
    public string? Remarks { get; set; }
}
