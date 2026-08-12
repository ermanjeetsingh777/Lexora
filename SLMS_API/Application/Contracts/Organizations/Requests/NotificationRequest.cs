namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class NotificationRequest
{
    public string? Title { get; set; }
    public string? Message { get; set; }
    public string? NotificationType { get; set; }
}
