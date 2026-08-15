namespace SLMS_API.Application.Contracts.Books.Responses;

public class BookReturnResponse
{
    public BookDetailResponse Book { get; set; } = default!;
    public decimal? FineAmount { get; set; }
    public int? OverdueDays { get; set; }
}
