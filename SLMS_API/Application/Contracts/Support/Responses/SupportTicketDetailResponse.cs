using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Support.Responses;

public class SupportTicketDetailResponse
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public TicketCategory Category { get; set; }
    public TicketPriority Priority { get; set; }
    public TicketStatus Status { get; set; }
    public string? Area { get; set; }
    public string RequesterName { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;
    public string? OwnerName { get; set; }
    public string Channel { get; set; } = "Portal";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? SlaDueAtUtc { get; set; }
    public IReadOnlyCollection<SupportTicketMessageResponse> Messages { get; set; } = Array.Empty<SupportTicketMessageResponse>();
    public IReadOnlyCollection<SupportAttachmentResponse> Attachments { get; set; } = Array.Empty<SupportAttachmentResponse>();
}
