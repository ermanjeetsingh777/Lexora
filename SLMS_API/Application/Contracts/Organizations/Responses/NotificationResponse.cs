namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class NotificationResponse
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public string? NotificationType { get; set; }
    public Guid? MemberId { get; set; }
    public Guid? BookLoanId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
