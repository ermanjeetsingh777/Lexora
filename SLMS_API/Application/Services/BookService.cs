using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Books.Requests;
using SLMS_API.Application.Contracts.Books.Responses;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Common.Utilities;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class BookService : IBookService
{
    private const long MaxPdfBytes = 25 * 1024 * 1024;

    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _environment;
    private readonly INotificationService _notificationService;

    public BookService(ApplicationDbContext db, IWebHostEnvironment environment, INotificationService notificationService)
    {
        _db = db;
        _environment = environment;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyCollection<BookListItemResponse>> GetBooksAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        string? search,
        string? category,
        BookStockStatus? status,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        var now = DateTime.UtcNow;
        var books = await _db.Books
            .AsNoTracking()
            .Where(b => !b.IsDeleted && b.LibraryId == libraryId)
            .Include(b => b.Loans.Where(l => !l.IsDeleted))
            .ToListAsync(cancellationToken);

        var query = search?.Trim().ToLowerInvariant();
        var items = books
            .Select(b =>
            {
                var activeLoans = b.Loans.Where(l => l.Status != BookLoanStatus.Returned).ToList();
                var overdue = activeLoans.Count(l => ResolveLoanStatus(l, b, now) == BookLoanStatus.Overdue);
                var stockStatus = ComputeStockStatus(b.AvailableCopies, b.TotalCopies);
                return new BookListItemResponse
                {
                    Id = b.Id,
                    Title = b.Title,
                    Author = b.Author,
                    Category = b.Category,
                    Isbn = b.Isbn,
                    TotalCopies = b.TotalCopies,
                    AvailableCopies = b.AvailableCopies,
                    Status = stockStatus,
                    OnLoanCount = activeLoans.Count,
                    OverdueCount = overdue,
                    HasPdf = HasPdf(b),
                    CreatedAtUtc = b.CreatedAtUtc,
                    UpdatedAtUtc = b.UpdatedAtUtc,
                };
            })
            .Where(b =>
            {
                if (!string.IsNullOrWhiteSpace(category) && !string.Equals(b.Category, category, StringComparison.OrdinalIgnoreCase))
                    return false;
                if (status.HasValue && b.Status != status.Value) return false;
                if (string.IsNullOrWhiteSpace(query)) return true;
                return b.Title.ToLowerInvariant().Contains(query)
                    || b.Author.ToLowerInvariant().Contains(query)
                    || b.Isbn.Contains(query, StringComparison.OrdinalIgnoreCase);
            })
            .OrderBy(b => b.Title)
            .ToList();

        return items;
    }

    public async Task<BookStatsResponse> GetStatsAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        CancellationToken cancellationToken = default)
    {
        var books = await GetBooksAsync(institutionId, branchId, libraryId, null, null, null, cancellationToken);
        var now = DateTime.UtcNow;
        var activeLoans = await _db.BookLoans
            .AsNoTracking()
            .Where(l => !l.IsDeleted && l.LibraryId == libraryId && l.Status != BookLoanStatus.Returned)
            .ToListAsync(cancellationToken);

        var bookById = books.ToDictionary(b => b.Id);
        return new BookStatsResponse
        {
            TitleCount = books.Count,
            TotalCopies = books.Sum(b => b.TotalCopies),
            AvailableCopies = books.Sum(b => b.AvailableCopies),
            OnLoanCount = activeLoans.Count,
            OverdueCount = activeLoans.Count(l =>
                bookById.TryGetValue(l.BookId, out var book)
                && !book.HasPdf
                && l.Status != BookLoanStatus.Returned
                && !l.ReturnedAtUtc.HasValue
                && l.DueAtUtc < now),
            LowStockCount = books.Count(b => b.Status == BookStockStatus.LowStock),
            OutOfStockCount = books.Count(b => b.Status == BookStockStatus.OutOfStock),
            Categories = books
                .GroupBy(b => b.Category)
                .Select(g => new BookCategoryStatResponse { Category = g.Key, Copies = g.Sum(x => x.TotalCopies) })
                .OrderByDescending(x => x.Copies)
                .ToList(),
        };
    }

    public async Task<BookDetailResponse?> GetByIdAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        var book = await _db.Books
            .AsNoTracking()
            .Include(b => b.Loans.Where(l => !l.IsDeleted))
            .Include(b => b.AuditEntries.Where(a => !a.IsDeleted))
            .FirstOrDefaultAsync(b => b.Id == bookId && !b.IsDeleted && b.LibraryId == libraryId, cancellationToken);

        return book is null ? null : MapDetail(book);
    }

    public async Task<BookDetailResponse> CreateAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        CreateBookRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        ValidateBookRequest(request.Title, request.Author, request.Category, request.Isbn, request.TotalCopies, request.AvailableCopies);
        var isbn = IsbnValidator.Normalize(request.Isbn);
        await EnsureUniqueIsbnAsync(libraryId, isbn, null, cancellationToken);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            InstitutionId = institutionId,
            BranchId = branchId,
            LibraryId = libraryId,
            Title = request.Title.Trim(),
            Author = request.Author.Trim(),
            Category = request.Category.Trim(),
            Isbn = isbn,
            TotalCopies = request.TotalCopies,
            AvailableCopies = request.AvailableCopies,
            Notes = request.Notes?.Trim(),
            CreatedBy = userId,
        };

        _db.Books.Add(book);
        AddAuditEntry(book.Id, BookAuditType.Added, book.Title, null, userId, actorName);
        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
    }

    public async Task<BookDetailResponse> UpdateAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        UpdateBookRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        var book = await LoadBookForWriteAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
        ValidateBookRequest(request.Title, request.Author, request.Category, request.Isbn, request.TotalCopies, request.AvailableCopies);
        var isbn = IsbnValidator.Normalize(request.Isbn);
        await EnsureUniqueIsbnAsync(libraryId, isbn, bookId, cancellationToken);

        book.Title = request.Title.Trim();
        book.Author = request.Author.Trim();
        book.Category = request.Category.Trim();
        book.Isbn = isbn;
        book.TotalCopies = request.TotalCopies;
        book.AvailableCopies = request.AvailableCopies;
        book.Notes = request.Notes?.Trim();
        book.UpdatedAtUtc = DateTime.UtcNow;
        book.UpdatedBy = userId;

        AddAuditEntry(book.Id, BookAuditType.Edited, book.Title, null, userId, actorName);

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
    }

    public async Task<BookDetailResponse> AdjustStockAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        AdjustBookStockRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        var book = await LoadBookForWriteAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
        if (request.Delta == 0) throw new InvalidOperationException("Adjustment delta cannot be zero.");

        var nextAvailable = Math.Clamp(book.AvailableCopies + request.Delta, 0, book.TotalCopies);
        if (nextAvailable < 0) throw new InvalidOperationException("Available copies cannot be negative.");
        book.AvailableCopies = nextAvailable;
        book.UpdatedAtUtc = DateTime.UtcNow;
        book.UpdatedBy = userId;

        AddAuditEntry(book.Id, BookAuditType.Adjust, request.Note, request.Delta, userId, actorName);

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
    }

    public async Task<BookDetailResponse> MarkConditionAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        string kind,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        var book = await LoadBookForWriteAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
        if (book.TotalCopies <= 0) throw new InvalidOperationException("No copies available to mark.");

        book.TotalCopies = Math.Max(0, book.TotalCopies - 1);
        book.AvailableCopies = Math.Min(book.AvailableCopies, book.TotalCopies);
        book.UpdatedAtUtc = DateTime.UtcNow;
        book.UpdatedBy = userId;

        var auditType = string.Equals(kind, "lost", StringComparison.OrdinalIgnoreCase)
            ? BookAuditType.Lost
            : BookAuditType.Damaged;

        AddAuditEntry(book.Id, auditType, $"Marked {kind.ToLowerInvariant()}", -1, userId, actorName);

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
    }

    public async Task<BookDetailResponse> CheckoutAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CheckoutBookRequest request,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        var book = await LoadBookForWriteAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
        if (HasPdf(book))
        {
            throw new InvalidOperationException("Digital books with a PDF are not issued as physical copies. Members can view the PDF directly.");
        }

        if (book.AvailableCopies <= 0) throw new InvalidOperationException("No copies available to issue.");

        var member = await _db.Members
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == request.MemberId && !m.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Member not found.");

        var memberName = string.IsNullOrWhiteSpace(member.FullName) ? member.MembershipNo : member.FullName;

        var library = await _db.Libraries.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == libraryId && !l.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Library not found.");

        book.AvailableCopies -= 1;
        book.UpdatedAtUtc = DateTime.UtcNow;
        book.UpdatedBy = userId;

        var loanDays = request.LoanDays > 0
            ? Math.Clamp(request.LoanDays, 1, 90)
            : Math.Clamp(library.DefaultLoanDays, 1, 90);
        var loan = new BookLoan
        {
            Id = Guid.NewGuid(),
            BookId = book.Id,
            MemberId = member.Id,
            LibraryId = libraryId,
            MemberName = memberName,
            Status = BookLoanStatus.Active,
            LoanDays = loanDays,
            CheckedOutAtUtc = DateTime.UtcNow,
            DueAtUtc = DateTime.UtcNow.AddDays(loanDays),
            CreatedBy = userId,
        };
        _db.BookLoans.Add(loan);

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
    }

    public async Task<BookReturnResponse> ReturnLoanAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        Guid loanId,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        var book = await LoadBookForWriteAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
        var loan = await _db.BookLoans
            .FirstOrDefaultAsync(l => l.Id == loanId && l.BookId == book.Id && !l.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Loan not found.");

        if (loan.Status == BookLoanStatus.Returned) throw new InvalidOperationException("Book already returned.");
        if (HasPdf(book))
        {
            throw new InvalidOperationException("Digital books with a PDF do not require a physical return.");
        }

        var library = await _db.Libraries.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == libraryId && !l.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Library not found.");

        var returnedAt = DateTime.UtcNow;
        var overdueDays = ComputeOverdueDays(loan.DueAtUtc, returnedAt);
        var fineAmount = overdueDays > 0 ? overdueDays * library.OverdueFinePerDay : 0m;

        loan.Status = BookLoanStatus.Returned;
        loan.ReturnedAtUtc = returnedAt;
        loan.OverdueDays = overdueDays > 0 ? overdueDays : null;
        loan.FineAmount = fineAmount > 0 ? fineAmount : null;
        loan.UpdatedAtUtc = returnedAt;
        loan.UpdatedBy = userId;

        book.AvailableCopies = Math.Min(book.TotalCopies, book.AvailableCopies + 1);
        book.UpdatedAtUtc = DateTime.UtcNow;
        book.UpdatedBy = userId;

        await _db.SaveChangesAsync(cancellationToken);
        var bookDetail = (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
        return new BookReturnResponse
        {
            Book = bookDetail,
            FineAmount = fineAmount > 0 ? fineAmount : null,
            OverdueDays = overdueDays > 0 ? overdueDays : null,
        };
    }

    public async Task<IReadOnlyCollection<MemberBookLoanResponse>> GetMemberLoansAsync(
        Guid memberId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var loans = await _db.BookLoans
            .AsNoTracking()
            .Where(l => !l.IsDeleted && l.MemberId == memberId)
            .Include(l => l.Book)
            .OrderByDescending(l => l.CheckedOutAtUtc)
            .ToListAsync(cancellationToken);

        var libraryIds = loans.Select(l => l.LibraryId).Distinct().ToList();
        var fineRates = await _db.Libraries.AsNoTracking()
            .Where(l => libraryIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.OverdueFinePerDay, cancellationToken);

        return loans.Select(l =>
        {
            var hasPdf = HasPdf(l.Book);
            var requiresReturn = !hasPdf;
            var status = ResolveLoanStatus(l, l.Book, now);
            var overdueDays = requiresReturn && status == BookLoanStatus.Overdue
                ? ComputeOverdueDays(l.DueAtUtc, now)
                : l.OverdueDays ?? 0;
            var finePerDay = fineRates.TryGetValue(l.LibraryId, out var rate) ? rate : 10m;
            var fineAmount = requiresReturn
                ? l.FineAmount ?? (status == BookLoanStatus.Overdue ? overdueDays * finePerDay : 0m)
                : 0m;

            return new MemberBookLoanResponse
            {
                Id = l.Id,
                BookId = l.BookId,
                Title = l.Book.Title,
                Author = l.Book.Author,
                Category = l.Book.Category,
                BorrowedAtUtc = l.CheckedOutAtUtc,
                DueAtUtc = l.DueAtUtc,
                ReturnedAtUtc = l.ReturnedAtUtc,
                Status = status,
                LoanDays = l.LoanDays > 0 ? l.LoanDays : 14,
                DaysOverdue = overdueDays,
                FineAmount = fineAmount,
                HasPdf = hasPdf,
                RequiresReturn = requiresReturn,
            };
        }).ToList();
    }

    public async Task<BookReminderResponse> SendReturnReminderAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        Guid loanId,
        string? userId,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        var now = DateTime.UtcNow;

        var loan = await _db.BookLoans
            .Include(l => l.Book)
            .Include(l => l.Member)
            .FirstOrDefaultAsync(l =>
                l.Id == loanId
                && l.BookId == bookId
                && l.LibraryId == libraryId
                && !l.IsDeleted,
                cancellationToken)
            ?? throw new InvalidOperationException("Loan not found.");

        if (loan.Status == BookLoanStatus.Returned || loan.ReturnedAtUtc.HasValue)
        {
            throw new InvalidOperationException("This loan is already returned.");
        }

        if (HasPdf(loan.Book))
        {
            throw new InvalidOperationException("Return reminders do not apply to digital PDF books.");
        }

        var status = ResolveLoanStatus(loan, loan.Book, now);
        if (status != BookLoanStatus.Overdue)
        {
            throw new InvalidOperationException("Reminder can only be sent for overdue books.");
        }

        var library = await _db.Libraries.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == libraryId && !l.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Library not found.");

        var daysOverdue = ComputeOverdueDays(loan.DueAtUtc, now);
        var estimatedFine = daysOverdue * library.OverdueFinePerDay;
        var memberName = string.IsNullOrWhiteSpace(loan.Member.FullName) ? loan.Member.MembershipNo : loan.Member.FullName;
        var message = $"Please return \"{loan.Book.Title}\". It was due on {loan.DueAtUtc:dd MMM yyyy} ({daysOverdue} day(s) overdue). Estimated fine: ₹{estimatedFine:0.##}.";

        loan.LastReminderSentAtUtc = now;
        loan.UpdatedAtUtc = now;
        loan.UpdatedBy = userId;

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await _notificationService.CreateAsync(userId, new NotificationRequest
            {
                Title = "Book return reminder sent",
                Message = $"{memberName}: {message}",
                NotificationType = "book_return_reminder",
                MemberId = loan.MemberId,
                BookLoanId = loan.Id,
            }, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new BookReminderResponse
        {
            LoanId = loan.Id,
            MemberId = loan.MemberId,
            MemberName = memberName,
            MemberPhone = loan.Member.PhoneNumber,
            BookTitle = loan.Book.Title,
            DueAtUtc = loan.DueAtUtc,
            DaysOverdue = daysOverdue,
            EstimatedFine = estimatedFine,
            Message = message,
        };
    }

    public async Task<IReadOnlyCollection<BookListItemResponse>> GetMemberDigitalBooksAsync(
        Guid memberId,
        string? search,
        string? category,
        CancellationToken cancellationToken = default)
    {
        var (institutionId, branchId, libraryId) = await ResolveMemberLibraryAsync(memberId, cancellationToken);
        var books = await GetBooksAsync(institutionId, branchId, libraryId, search, category, null, cancellationToken);
        return books.Where(b => b.HasPdf).ToList();
    }

    public async Task<(string FilePath, string ContentType, string FileName)?> GetMemberDigitalBookPdfAsync(
        Guid memberId,
        Guid bookId,
        CancellationToken cancellationToken = default)
    {
        var (institutionId, branchId, libraryId) = await ResolveMemberLibraryAsync(memberId, cancellationToken);
        var book = await _db.Books.AsNoTracking()
            .FirstOrDefaultAsync(b =>
                b.Id == bookId
                && !b.IsDeleted
                && b.LibraryId == libraryId
                && b.BranchId == branchId
                && b.InstitutionId == institutionId,
                cancellationToken);

        if (book is null || !HasPdf(book))
        {
            return null;
        }

        return await GetPdfAsync(institutionId, branchId, libraryId, bookId, cancellationToken);
    }

    public async Task<BookDetailResponse> UploadPdfAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        IFormFile file,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0) throw new InvalidOperationException("PDF file is empty.");
        if (file.Length > MaxPdfBytes) throw new InvalidOperationException("PDF exceeds the 25 MB limit.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".pdf")
        {
            throw new InvalidOperationException("Only PDF files are allowed.");
        }

        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        var book = await _db.Books.AsNoTracking()
            .FirstOrDefaultAsync(b =>
                b.Id == bookId
                && !b.IsDeleted
                && b.LibraryId == libraryId
                && b.BranchId == branchId
                && b.InstitutionId == institutionId,
                cancellationToken)
            ?? throw new InvalidOperationException("Book not found.");

        DeletePdfFileIfExists(book);

        var uploadRoot = Path.Combine(_environment.ContentRootPath, "uploads", "books", libraryId.ToString("N"));
        Directory.CreateDirectory(uploadRoot);

        var storagePath = Path.Combine(uploadRoot, $"{book.Id:N}.pdf");
        await using (var stream = File.Create(storagePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var pdfFileName = Path.GetFileName(file.FileName);
        var updatedAtUtc = DateTime.UtcNow;
        var rows = await _db.Books
            .Where(b =>
                b.Id == bookId
                && !b.IsDeleted
                && b.LibraryId == libraryId
                && b.BranchId == branchId
                && b.InstitutionId == institutionId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(b => b.PdfStoragePath, storagePath)
                .SetProperty(b => b.PdfFileName, pdfFileName)
                .SetProperty(b => b.UpdatedAtUtc, updatedAtUtc)
                .SetProperty(b => b.UpdatedBy, userId),
                cancellationToken);

        if (rows == 0)
        {
            File.Delete(storagePath);
            throw new InvalidOperationException("Book not found.");
        }

        AddAuditEntry(book.Id, BookAuditType.Edited, "PDF uploaded", null, userId, actorName);
        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
    }

    public async Task<(string FilePath, string ContentType, string FileName)?> GetPdfAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        var book = await _db.Books.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == bookId && !b.IsDeleted && b.LibraryId == libraryId, cancellationToken);

        if (book is null || !HasPdf(book) || string.IsNullOrWhiteSpace(book.PdfStoragePath))
        {
            return null;
        }

        if (!File.Exists(book.PdfStoragePath))
        {
            throw new InvalidOperationException("PDF file is missing on disk.");
        }

        var fileName = string.IsNullOrWhiteSpace(book.PdfFileName) ? $"{book.Title}.pdf" : book.PdfFileName;
        return (book.PdfStoragePath, "application/pdf", fileName);
    }

    public async Task<BookDetailResponse> RemovePdfAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        string? userId,
        string? actorName,
        CancellationToken cancellationToken = default)
    {
        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        var book = await _db.Books.AsNoTracking()
            .FirstOrDefaultAsync(b =>
                b.Id == bookId
                && !b.IsDeleted
                && b.LibraryId == libraryId
                && b.BranchId == branchId
                && b.InstitutionId == institutionId,
                cancellationToken)
            ?? throw new InvalidOperationException("Book not found.");

        if (!HasPdf(book))
        {
            throw new InvalidOperationException("This book has no PDF attached.");
        }

        DeletePdfFileIfExists(book);

        var updatedAtUtc = DateTime.UtcNow;
        var rows = await _db.Books
            .Where(b =>
                b.Id == bookId
                && !b.IsDeleted
                && b.LibraryId == libraryId
                && b.BranchId == branchId
                && b.InstitutionId == institutionId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(b => b.PdfStoragePath, (string?)null)
                .SetProperty(b => b.PdfFileName, (string?)null)
                .SetProperty(b => b.UpdatedAtUtc, updatedAtUtc)
                .SetProperty(b => b.UpdatedBy, userId),
                cancellationToken);

        if (rows == 0)
        {
            throw new InvalidOperationException("Book not found.");
        }

        AddAuditEntry(book.Id, BookAuditType.Edited, "PDF removed", null, userId, actorName);
        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(institutionId, branchId, libraryId, book.Id, cancellationToken))!;
    }

    private async Task EnsureLibraryAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken)
    {
        var exists = await _db.Libraries.AnyAsync(x =>
            x.Id == libraryId && x.BranchId == branchId && x.InstitutionId == institutionId, cancellationToken);
        if (!exists) throw new InvalidOperationException("Library not found.");
    }

    private async Task<(Guid InstitutionId, Guid BranchId, Guid LibraryId)> ResolveMemberLibraryAsync(
        Guid memberId,
        CancellationToken cancellationToken)
    {
        var mapping = await _db.MemberLibraries
            .AsNoTracking()
            .Where(x => x.MemberId == memberId && !x.IsDeleted && x.IsCurrent)
            .OrderByDescending(x => x.JoinedOn)
            .Select(x => new { x.InstitutionId, x.BranchId, x.LibraryId })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("Member library not found.");

        return (mapping.InstitutionId, mapping.BranchId, mapping.LibraryId);
    }

    private async Task<Book> LoadBookForWriteAsync(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        Guid bookId,
        CancellationToken cancellationToken)
    {
        await EnsureLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
        return await _db.Books
            .FirstOrDefaultAsync(b =>
                b.Id == bookId
                && !b.IsDeleted
                && b.LibraryId == libraryId
                && b.BranchId == branchId
                && b.InstitutionId == institutionId,
                cancellationToken)
            ?? throw new InvalidOperationException("Book not found.");
    }

    private void AddAuditEntry(
        Guid bookId,
        BookAuditType type,
        string? note,
        int? delta,
        string? userId,
        string? actorName)
    {
        _db.BookAuditEntries.Add(new BookAuditEntry
        {
            Id = Guid.NewGuid(),
            BookId = bookId,
            Type = type,
            Delta = delta,
            Note = note,
            ActorUserId = userId ?? string.Empty,
            ActorName = actorName ?? "System",
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = userId,
        });
    }

    private async Task EnsureUniqueIsbnAsync(Guid libraryId, string isbn, Guid? excludeBookId, CancellationToken cancellationToken)
    {
        var exists = await _db.Books.AnyAsync(b =>
            !b.IsDeleted &&
            b.LibraryId == libraryId &&
            b.Isbn == isbn &&
            (!excludeBookId.HasValue || b.Id != excludeBookId.Value), cancellationToken);
        if (exists) throw new InvalidOperationException("Another book already uses this ISBN.");
    }

    private static void ValidateBookRequest(string title, string author, string category, string isbn, int totalCopies, int availableCopies)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length < 2)
            throw new InvalidOperationException("Title is required.");
        if (string.IsNullOrWhiteSpace(author) || author.Trim().Length < 2)
            throw new InvalidOperationException("Author is required.");
        if (string.IsNullOrWhiteSpace(category) || category.Trim().Length < 2)
            throw new InvalidOperationException("Category is required.");
        if (!IsbnValidator.IsValid(isbn))
            throw new InvalidOperationException("ISBN must be a valid ISBN-10 or ISBN-13.");
        if (totalCopies < 0) throw new InvalidOperationException("Total copies cannot be negative.");
        if (availableCopies < 0 || availableCopies > totalCopies)
            throw new InvalidOperationException("Available copies must be between 0 and total copies.");
    }

    private static BookStockStatus ComputeStockStatus(int available, int total) =>
        available <= 0 ? BookStockStatus.OutOfStock
        : available <= Math.Max(2, (int)Math.Round(total * 0.25m)) ? BookStockStatus.LowStock
        : BookStockStatus.Available;

    private static int ComputeOverdueDays(DateTime dueAtUtc, DateTime asOfUtc) =>
        dueAtUtc >= asOfUtc ? 0 : Math.Max(1, (int)Math.Ceiling((asOfUtc - dueAtUtc).TotalDays));

    private static BookLoanStatus ResolveLoanStatus(BookLoan loan, Book book, DateTime now)
    {
        if (loan.Status == BookLoanStatus.Returned || loan.ReturnedAtUtc.HasValue)
            return BookLoanStatus.Returned;
        if (HasPdf(book))
            return BookLoanStatus.Active;
        if (loan.DueAtUtc < now) return BookLoanStatus.Overdue;
        return BookLoanStatus.Active;
    }

    private static bool HasPdf(Book book) =>
        !string.IsNullOrWhiteSpace(book.PdfStoragePath);

    private static void DeletePdfFileIfExists(Book book)
    {
        if (string.IsNullOrWhiteSpace(book.PdfStoragePath) || !File.Exists(book.PdfStoragePath))
        {
            return;
        }

        File.Delete(book.PdfStoragePath);
    }

    private static BookDetailResponse MapDetail(Book book)
    {
        var now = DateTime.UtcNow;
        return new BookDetailResponse
        {
            Id = book.Id,
            InstitutionId = book.InstitutionId,
            BranchId = book.BranchId,
            LibraryId = book.LibraryId,
            Title = book.Title,
            Author = book.Author,
            Category = book.Category,
            Isbn = book.Isbn,
            TotalCopies = book.TotalCopies,
            AvailableCopies = book.AvailableCopies,
            Status = ComputeStockStatus(book.AvailableCopies, book.TotalCopies),
            Notes = book.Notes,
            HasPdf = HasPdf(book),
            PdfFileName = book.PdfFileName,
            Activities = book.Loans
                .OrderByDescending(l => l.CheckedOutAtUtc)
                .SelectMany(l =>
                {
                    var requiresReturn = !HasPdf(book);
                    var status = ResolveLoanStatus(l, book, now);
                    var daysOverdue = requiresReturn && status == BookLoanStatus.Overdue
                        ? ComputeOverdueDays(l.DueAtUtc, now)
                        : 0;
                    var items = new List<BookActivityResponse>
                    {
                        new()
                        {
                            Id = l.Id,
                            BookId = l.BookId,
                            MemberId = l.MemberId,
                            MemberName = l.MemberName,
                            Type = "borrow",
                            OccurredAtUtc = l.CheckedOutAtUtc,
                            DueAtUtc = requiresReturn ? l.DueAtUtc : null,
                            LoanDays = requiresReturn ? (l.LoanDays > 0 ? l.LoanDays : 14) : null,
                            IsOverdue = requiresReturn && status == BookLoanStatus.Overdue,
                            DaysOverdue = daysOverdue,
                            EstimatedFine = requiresReturn
                                ? l.FineAmount ?? (daysOverdue > 0 ? daysOverdue * 10m : 0m)
                                : 0m,
                            RequiresReturn = requiresReturn,
                        },
                    };
                    if (l.ReturnedAtUtc.HasValue)
                    {
                        items.Add(new BookActivityResponse
                        {
                            Id = Guid.NewGuid(),
                            BookId = l.BookId,
                            MemberId = l.MemberId,
                            MemberName = l.MemberName,
                            Type = "return",
                            OccurredAtUtc = l.ReturnedAtUtc.Value,
                        });
                    }
                    else if (requiresReturn && status == BookLoanStatus.Overdue)
                    {
                        items.Add(new BookActivityResponse
                        {
                            Id = Guid.NewGuid(),
                            BookId = l.BookId,
                            MemberId = l.MemberId,
                            MemberName = l.MemberName,
                            Type = "overdue",
                            OccurredAtUtc = l.DueAtUtc,
                            RequiresReturn = true,
                        });
                    }
                    return items;
                })
                .OrderByDescending(a => a.OccurredAtUtc)
                .ToList(),
            AuditEntries = book.AuditEntries
                .OrderByDescending(a => a.CreatedAtUtc)
                .Select(a => new BookAuditResponse
                {
                    Id = a.Id,
                    Type = a.Type,
                    Delta = a.Delta,
                    Note = a.Note,
                    ActorName = a.ActorName,
                    OccurredAtUtc = a.CreatedAtUtc,
                })
                .ToList(),
        };
    }
}
