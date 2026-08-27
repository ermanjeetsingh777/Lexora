namespace SLMS_API.Application.Contracts.Support.Responses;

public class SupportTicketCapabilitiesResponse
{
    public bool CanReply { get; set; }
    public bool CanChangeStatus { get; set; }
    public bool CanCreateOnBehalf { get; set; }
}
