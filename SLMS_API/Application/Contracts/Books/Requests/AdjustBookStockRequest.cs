namespace SLMS_API.Application.Contracts.Books.Requests;

public class AdjustBookStockRequest
{
    public int Delta { get; set; }
    public string? Note { get; set; }
}
