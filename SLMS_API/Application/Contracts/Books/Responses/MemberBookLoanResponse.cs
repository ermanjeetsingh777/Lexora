using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Books.Responses;

public class MemberBookLoanResponse
{
    public Guid Id { get; set; }
    public Guid BookId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime BorrowedAtUtc { get; set; }
    public DateTime DueAtUtc { get; set; }
    public DateTime? ReturnedAtUtc { get; set; }
    public BookLoanStatus Status { get; set; }
    public int LoanDays { get; set; }
    public int DaysOverdue { get; set; }
    public decimal FineAmount { get; set; }
}
