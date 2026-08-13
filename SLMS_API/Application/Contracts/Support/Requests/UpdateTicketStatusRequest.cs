using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Support.Requests;

public class UpdateTicketStatusRequest
{
    public TicketStatus Status { get; set; }
    public string? OwnerName { get; set; }
}
