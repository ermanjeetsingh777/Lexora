namespace SLMS_API.Application.Contracts.Support.Responses;

public class SystemIncidentUpdateResponse
{
    public Guid Id { get; set; }
    public string Phase { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
}

public class SystemIncidentResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Components { get; set; } = Array.Empty<string>();
    public DateTime StartedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
    public IReadOnlyCollection<SystemIncidentUpdateResponse> Updates { get; set; } = Array.Empty<SystemIncidentUpdateResponse>();
}

public class SystemComponentHealthResponse
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Operational";
    public int ResponseMs { get; set; }
    public IReadOnlyCollection<double> Uptime90 { get; set; } = Array.Empty<double>();
}

public class SystemStatusResponse
{
    public string OverallStatus { get; set; } = "Operational";
    public double AverageUptime90 { get; set; }
    public DateTime LastSyncUtc { get; set; }
    public IReadOnlyCollection<SystemComponentHealthResponse> Components { get; set; } = Array.Empty<SystemComponentHealthResponse>();
    public IReadOnlyCollection<SystemIncidentResponse> ActiveIncidents { get; set; } = Array.Empty<SystemIncidentResponse>();
    public IReadOnlyCollection<SystemIncidentResponse> IncidentHistory { get; set; } = Array.Empty<SystemIncidentResponse>();
}
