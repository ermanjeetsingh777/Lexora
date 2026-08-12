namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class NotificationResponse
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public bool IsRead { get; set; }
}
