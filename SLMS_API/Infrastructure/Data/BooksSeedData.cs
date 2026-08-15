using Microsoft.EntityFrameworkCore;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Infrastructure.Data;

public static class BooksSeedData
{
    public static async Task SeedAsync(ApplicationDbContext db, CancellationToken cancellationToken = default)
    {
        if (await db.Books.AnyAsync(cancellationToken)) return;

        var library = await db.Libraries.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (library is null) return;

        var books = new[]
        {
            new Book { Title = "The Pragmatic Programmer", Author = "Andy Hunt", Category = "Engineering", Isbn = "9780135957059", TotalCopies = 5, AvailableCopies = 3 },
            new Book { Title = "Clean Code", Author = "Robert C. Martin", Category = "Engineering", Isbn = "9780132350884", TotalCopies = 4, AvailableCopies = 2 },
            new Book { Title = "Atomic Habits", Author = "James Clear", Category = "Self-help", Isbn = "9780735211292", TotalCopies = 6, AvailableCopies = 4 },
            new Book { Title = "Sapiens", Author = "Yuval Noah Harari", Category = "History", Isbn = "9780062316097", TotalCopies = 3, AvailableCopies = 1 },
            new Book { Title = "Deep Work", Author = "Cal Newport", Category = "Productivity", Isbn = "9781455586691", TotalCopies = 4, AvailableCopies = 0 },
            new Book { Title = "Introduction to Algorithms", Author = "Cormen et al.", Category = "Engineering", Isbn = "9780262046305", TotalCopies = 2, AvailableCopies = 2 },
            new Book { Title = "The Lean Startup", Author = "Eric Ries", Category = "Business", Isbn = "9780307887894", TotalCopies = 3, AvailableCopies = 2 },
            new Book { Title = "Thinking, Fast and Slow", Author = "Daniel Kahneman", Category = "Psychology", Isbn = "9780374533557", TotalCopies = 2, AvailableCopies = 1 },
        };

        foreach (var seed in books)
        {
            var book = new Book
            {
                Id = Guid.NewGuid(),
                InstitutionId = library.InstitutionId,
                BranchId = library.BranchId,
                LibraryId = library.Id,
                Title = seed.Title,
                Author = seed.Author,
                Category = seed.Category,
                Isbn = seed.Isbn,
                TotalCopies = seed.TotalCopies,
                AvailableCopies = seed.AvailableCopies,
                CreatedAtUtc = DateTime.UtcNow,
            };
            book.AuditEntries.Add(new BookAuditEntry
            {
                Id = Guid.NewGuid(),
                BookId = book.Id,
                Type = Common.Enums.BookAuditType.Added,
                Note = book.Title,
                ActorUserId = "seed",
                ActorName = "System",
                CreatedAtUtc = DateTime.UtcNow,
            });
            db.Books.Add(book);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
