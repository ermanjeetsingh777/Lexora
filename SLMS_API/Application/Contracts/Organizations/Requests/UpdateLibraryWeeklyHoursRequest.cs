namespace SLMS_API.Application.Contracts.Organizations.Requests;

public class UpdateLibraryWeeklyHoursRequest
{
    public IReadOnlyCollection<LibraryDayHoursRequest> WeeklyHours { get; set; } = [];
}

public class LibraryDayHoursRequest
{
    public string Day { get; set; } = string.Empty;
    public bool Closed { get; set; }
    public string? Open { get; set; }
    public string? Close { get; set; }
}

public class UpdateLibraryHoursExceptionsRequest
{
    public IReadOnlyCollection<LibraryHoursExceptionRequest> Exceptions { get; set; } = [];
}

public class LibraryHoursExceptionRequest
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public bool Closed { get; set; }
    public string? Open { get; set; }
    public string? Close { get; set; }
}
