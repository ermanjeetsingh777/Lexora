using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class SupportTicketStatusHistory : AuditableEntity
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public SupportTicket Ticket { get; set; } = default!;
    public TicketStatus FromStatus { get; set; }
    public TicketStatus ToStatus { get; set; }
    public string ChangedByUserId { get; set; } = string.Empty;
    public string ChangedByName { get; set; } = string.Empty;
    public string ChangedByRole { get; set; } = string.Empty;
}
