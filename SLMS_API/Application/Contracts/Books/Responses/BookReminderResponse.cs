namespace SLMS_API.Application.Contracts.Books.Responses;

public class BookReminderResponse
{
    public Guid LoanId { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string? MemberPhone { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public DateTime DueAtUtc { get; set; }
    public int DaysOverdue { get; set; }
    public decimal EstimatedFine { get; set; }
    public string Message { get; set; } = string.Empty;
}
