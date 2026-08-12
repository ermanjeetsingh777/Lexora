namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class UpdateSubscriptionRequest
{
    public DateTime? EndDate { get; set; }
    public string? Status { get; set; }
}
