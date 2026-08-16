namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class InstitutionRevenueDayResponse
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal Renewals { get; set; }
}

public class InstitutionAttendanceDayResponse
{
    public string Date { get; set; } = string.Empty;
    public int Present { get; set; }
    public int Late { get; set; }
    public int Absent { get; set; }
}

public class InstitutionOccupancyHeatmapResponse
{
    public IReadOnlyCollection<string> Days { get; set; } = [];
    public IReadOnlyCollection<int> Hours { get; set; } = [];
    public IReadOnlyCollection<InstitutionHeatmapCellResponse> Cells { get; set; } = [];
}

public class InstitutionHeatmapCellResponse
{
    public string Day { get; set; } = string.Empty;
    public int Hour { get; set; }
    public int Value { get; set; }
}
