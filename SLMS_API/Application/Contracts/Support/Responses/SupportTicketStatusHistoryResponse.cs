using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Support.Responses;

public class SupportTicketStatusHistoryResponse
{
    public Guid Id { get; set; }
    public TicketStatus FromStatus { get; set; }
    public TicketStatus ToStatus { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
    public string ChangedByRole { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
