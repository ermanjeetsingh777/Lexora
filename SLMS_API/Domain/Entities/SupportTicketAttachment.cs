using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class SupportTicketAttachment : AuditableEntity
{
    public Guid Id { get; set; }
    public Guid? TicketId { get; set; }
    public SupportTicket? Ticket { get; set; }
    public Guid? MessageId { get; set; }
    public SupportTicketMessage? Message { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public string UploadedByUserId { get; set; } = string.Empty;
}
