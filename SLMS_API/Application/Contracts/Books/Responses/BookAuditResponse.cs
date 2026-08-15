using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Books.Responses;

public class BookAuditResponse
{
    public Guid Id { get; set; }
    public BookAuditType Type { get; set; }
    public int? Delta { get; set; }
    public string? Note { get; set; }
    public string ActorName { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
}
