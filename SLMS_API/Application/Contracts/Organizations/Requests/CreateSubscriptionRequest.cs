namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class CreateSubscriptionRequest
{
    public Guid MemberId { get; set; }
    public Guid SubscriptionPackageId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Amount { get; set; }
}
