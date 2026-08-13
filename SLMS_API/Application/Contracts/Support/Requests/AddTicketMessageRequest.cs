namespace SLMS_API.Application.Contracts.Support.Requests;

public class AddTicketMessageRequest
{
    public string Body { get; set; } = string.Empty;
    public IEnumerable<Guid>? AttachmentIds { get; set; }
}
