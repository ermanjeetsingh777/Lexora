using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Support.Requests;

public class CreateSupportTicketRequest
{
    public string Subject { get; set; } = string.Empty;
    public TicketCategory Category { get; set; }
    public TicketPriority Priority { get; set; } = TicketPriority.Normal;
    public string? Area { get; set; }
    public string Description { get; set; } = string.Empty;
    public IEnumerable<Guid>? AttachmentIds { get; set; }
}
