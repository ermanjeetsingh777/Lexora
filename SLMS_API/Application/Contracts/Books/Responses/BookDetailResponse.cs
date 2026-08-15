using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Contracts.Books.Responses;

public class BookDetailResponse
{
    public Guid Id { get; set; }
    public Guid InstitutionId { get; set; }
    public Guid BranchId { get; set; }
    public Guid LibraryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Isbn { get; set; } = string.Empty;
    public int TotalCopies { get; set; }
    public int AvailableCopies { get; set; }
    public BookStockStatus Status { get; set; }
    public string? Notes { get; set; }
    public bool HasPdf { get; set; }
    public string? PdfFileName { get; set; }
    public IReadOnlyCollection<BookActivityResponse> Activities { get; set; } = Array.Empty<BookActivityResponse>();
    public IReadOnlyCollection<BookAuditResponse> AuditEntries { get; set; } = Array.Empty<BookAuditResponse>();
}
