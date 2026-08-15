using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class BookLoan : AuditableEntity
{
    public Guid Id { get; set; }
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public Guid MemberId { get; set; }
    public Member Member { get; set; } = default!;
    public Guid LibraryId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public BookLoanStatus Status { get; set; } = BookLoanStatus.Active;
    public int LoanDays { get; set; } = 14;
    public DateTime CheckedOutAtUtc { get; set; }
    public DateTime DueAtUtc { get; set; }
    public DateTime? ReturnedAtUtc { get; set; }
    public int? OverdueDays { get; set; }
    public decimal? FineAmount { get; set; }
    public DateTime? LastReminderSentAtUtc { get; set; }
}
