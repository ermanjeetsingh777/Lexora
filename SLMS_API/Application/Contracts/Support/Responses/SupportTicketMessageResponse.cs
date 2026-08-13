namespace SLMS_API.Application.Contracts.Support.Responses;

public class SupportTicketMessageResponse
{
    public Guid Id { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public IReadOnlyCollection<SupportAttachmentResponse> Attachments { get; set; } = Array.Empty<SupportAttachmentResponse>();
}
