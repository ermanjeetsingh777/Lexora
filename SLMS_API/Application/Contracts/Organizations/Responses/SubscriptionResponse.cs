namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class SubscriptionResponse
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Status { get; set; }
}
