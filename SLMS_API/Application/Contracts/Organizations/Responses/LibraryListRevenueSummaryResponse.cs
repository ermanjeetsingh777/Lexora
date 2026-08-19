namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class LibraryListRevenueSummaryResponse
{
    public decimal RevenueMtd { get; set; }
    public decimal RevenuePreviousMtd { get; set; }
    public decimal RevenueMonthly { get; set; }
    public decimal RevenueQuarterly { get; set; }
    public decimal RevenueYearly { get; set; }
    public decimal RevenueAllTime { get; set; }
}
