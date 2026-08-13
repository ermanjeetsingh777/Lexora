using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class SupportTicketMessage : AuditableEntity
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public SupportTicket Ticket { get; set; } = default!;
    public string AuthorUserId { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = "Member";
    public string Body { get; set; } = string.Empty;

    public ICollection<SupportTicketAttachment> Attachments { get; set; } = new List<SupportTicketAttachment>();
}
