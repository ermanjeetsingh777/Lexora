namespace SLMS_API.Application.Contracts.Books.Responses;

public class BookStatsResponse
{
    public int TitleCount { get; set; }
    public int TotalCopies { get; set; }
    public int AvailableCopies { get; set; }
    public int OnLoanCount { get; set; }
    public int OverdueCount { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public IReadOnlyCollection<BookCategoryStatResponse> Categories { get; set; } = Array.Empty<BookCategoryStatResponse>();
}

public class BookCategoryStatResponse
{
    public string Category { get; set; } = string.Empty;
    public int Copies { get; set; }
}
