using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class SupportTicket : AuditableEntity
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public TicketCategory Category { get; set; }
    public TicketPriority Priority { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public string? Area { get; set; }
    public string RequesterUserId { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;
    public string? OwnerUserId { get; set; }
    public string? OwnerName { get; set; }
    public string Channel { get; set; } = "Portal";
    public string? Tags { get; set; }
    public Guid? LinkedArticleId { get; set; }
    public DateTime? SlaDueAtUtc { get; set; }
    public Guid? InstitutionId { get; set; }
    public string? InstitutionName { get; set; }
    public Guid? MemberId { get; set; }
    public string? CreatedByUserId { get; set; }

    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
    public ICollection<SupportTicketAttachment> Attachments { get; set; } = new List<SupportTicketAttachment>();
    public ICollection<SupportTicketStatusHistory> StatusHistory { get; set; } = new List<SupportTicketStatusHistory>();
}
