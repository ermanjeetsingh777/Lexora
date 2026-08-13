using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Support.Responses;

public class SupportTicketListItemResponse
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public TicketCategory Category { get; set; }
    public TicketPriority Priority { get; set; }
    public TicketStatus Status { get; set; }
    public string? OwnerName { get; set; }
    public string RequesterName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public int MessageCount { get; set; }
}
