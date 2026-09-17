namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class AssignSeatRequest
{
    public Guid? MemberId { get; set; }
    /// <summary>Alternative to MemberId — looked up within the seat's library.</summary>
    public string? MembershipNo { get; set; }
}
