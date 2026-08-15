using SLMS_API.Domain.Entities.Common;

namespace SLMS_API.Domain.Entities;

public class Book : AuditableEntity
{
    public Guid Id { get; set; }
    public Guid InstitutionId { get; set; }
    public Institution Institution { get; set; } = default!;
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = default!;
    public Guid LibraryId { get; set; }
    public Library Library { get; set; } = default!;
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Isbn { get; set; } = string.Empty;
    public int TotalCopies { get; set; } = 1;
    public int AvailableCopies { get; set; } = 1;
    public string? Notes { get; set; }
    public string? PdfStoragePath { get; set; }
    public string? PdfFileName { get; set; }
    public ICollection<BookLoan> Loans { get; set; } = new List<BookLoan>();
    public ICollection<BookAuditEntry> AuditEntries { get; set; } = new List<BookAuditEntry>();
}
