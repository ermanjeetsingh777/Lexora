using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Books.Responses;

public class BookListItemResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Isbn { get; set; } = string.Empty;
    public int TotalCopies { get; set; }
    public int AvailableCopies { get; set; }
    public BookStockStatus Status { get; set; }
    public int OnLoanCount { get; set; }
    public int OverdueCount { get; set; }
    public bool HasPdf { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
