namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionQuickViewResponse
{
    public InstitutionQuickViewTrendResponse Trend { get; set; } = new();
    public IReadOnlyCollection<InstitutionQuickViewActivityItemResponse> Activity { get; set; } = [];
}

public class InstitutionQuickViewTrendResponse
{
    public string Metric { get; set; } = "occupancy";
    public int RangeDays { get; set; }
    public IReadOnlyCollection<InstitutionTrendPointResponse> Points { get; set; } = [];
}

public class InstitutionTrendPointResponse
{
    public string Date { get; set; } = string.Empty;
    public decimal Value { get; set; }
}

public class InstitutionQuickViewActivityItemResponse
{
    public DateTime OccurredAtUtc { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
}
