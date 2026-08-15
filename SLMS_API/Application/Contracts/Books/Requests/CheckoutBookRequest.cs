namespace SLMS_API.Application.Contracts.Books.Requests;

public class CheckoutBookRequest
{
    public Guid MemberId { get; set; }
    public int LoanDays { get; set; } = 14;
}
