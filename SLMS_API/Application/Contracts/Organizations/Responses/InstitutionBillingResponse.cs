namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionBillingResponse
{
    public string Status { get; set; } = string.Empty;
    public decimal RevenueMtd { get; set; }
    public decimal RevenueAllTime { get; set; }
    public int ActiveMembers { get; set; }
    public IReadOnlyCollection<InstitutionBillingInvoiceResponse> Invoices { get; set; } = [];
}

public class InstitutionBillingInvoiceResponse
{
    public Guid Id { get; set; }
    public Guid? MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public DateTime IssuedAtUtc { get; set; }
    public DateTime PaidAtUtc { get; set; }
    public DateOnly PlanStartDate { get; set; }
    public DateOnly PlanEndDate { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "paid";
    public string Description { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
}
