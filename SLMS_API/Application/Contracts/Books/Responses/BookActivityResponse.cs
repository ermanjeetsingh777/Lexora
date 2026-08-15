namespace SLMS_API.Application.Contracts.Books.Responses;

public class BookActivityResponse
{
    public Guid Id { get; set; }
    public Guid BookId { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public int? LoanDays { get; set; }
    public bool IsOverdue { get; set; }
    public int DaysOverdue { get; set; }
    public decimal EstimatedFine { get; set; }
    public bool RequiresReturn { get; set; } = true;
}
