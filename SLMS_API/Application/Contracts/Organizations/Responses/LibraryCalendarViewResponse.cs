namespace SLMS_API.Application.Contracts.Organizations.Responses;

public class LibraryCalendarViewResponse
{
    public Guid LibraryId { get; set; }
    public string LibraryName { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public IReadOnlyCollection<LibraryCalendarDayResponse> Days { get; set; } = [];
    public IReadOnlyCollection<LibraryHoursExceptionResponse> Exceptions { get; set; } = [];
}

public class LibraryCalendarDayResponse
{
    public string Date { get; set; } = string.Empty;
    public string Day { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool Closed { get; set; }
    public string? Open { get; set; }
    public string? Close { get; set; }
    public string? Label { get; set; }
    public bool IsException { get; set; }
    public string Source { get; set; } = string.Empty;
}
