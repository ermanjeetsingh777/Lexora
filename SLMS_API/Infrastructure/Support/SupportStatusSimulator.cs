using System.Text.Json;
using SLMS_API.Application.Contracts.Support.Responses;

namespace SLMS_API.Infrastructure.Support;

public sealed class SupportStatusSimulator
{
    private readonly object _lock = new();
    private readonly Random _random = new();
    private DateTime _lastSyncUtc = DateTime.UtcNow;
    private readonly List<SystemComponentHealthResponse> _components;

    public SupportStatusSimulator()
    {
        _components = new List<SystemComponentHealthResponse>
        {
            CreateComponent("API Gateway", "Core REST API and authentication"),
            CreateComponent("Member Portal", "Web application and dashboards"),
            CreateComponent("Attendance", "Check-in, QR kiosk, and shift tracking"),
            CreateComponent("Notifications", "Email, SMS, and WhatsApp delivery"),
            CreateComponent("Billing", "Plans, invoices, and payment processing"),
            CreateComponent("Reports", "Analytics exports and scheduled reports"),
        };
    }

    public SystemStatusResponse BuildStatus(IReadOnlyCollection<SystemIncidentResponse> activeIncidents, IReadOnlyCollection<SystemIncidentResponse> history)
    {
        lock (_lock)
        {
            MaybeDegradeComponent();
            _lastSyncUtc = DateTime.UtcNow;

            var overall = activeIncidents.Any()
                ? activeIncidents.Any(i => i.Severity is "critical" or "major") ? "Major Outage" : "Degraded"
                : _components.Any(c => c.Status != "Operational") ? "Degraded" : "Operational";

            return new SystemStatusResponse
            {
                OverallStatus = overall,
                AverageUptime90 = Math.Round(_components.Average(c => c.Uptime90.Average()) * 100, 2),
                LastSyncUtc = _lastSyncUtc,
                Components = _components.Select(CloneComponent).ToList(),
                ActiveIncidents = activeIncidents,
                IncidentHistory = history,
            };
        }
    }

    public void ApplyIncident(string[] componentNames)
    {
        lock (_lock)
        {
            foreach (var component in _components.Where(c => componentNames.Contains(c.Name, StringComparer.OrdinalIgnoreCase)))
            {
                component.Status = "Partial Outage";
                component.ResponseMs += _random.Next(80, 250);
            }
        }
    }

    public void ResolveIncident(string[] componentNames)
    {
        lock (_lock)
        {
            foreach (var component in _components.Where(c => componentNames.Contains(c.Name, StringComparer.OrdinalIgnoreCase)))
            {
                component.Status = "Operational";
                component.ResponseMs = Math.Max(35, component.ResponseMs - _random.Next(40, 120));
            }
        }
    }

    private void MaybeDegradeComponent()
    {
        if (_random.NextDouble() > 0.12)
        {
            return;
        }

        var target = _components[_random.Next(_components.Count)];
        if (target.Status == "Operational")
        {
            target.Status = _random.NextDouble() > 0.6 ? "Degraded" : "Partial Outage";
            target.ResponseMs += _random.Next(20, 90);
        }
        else if (_random.NextDouble() > 0.4)
        {
            target.Status = "Operational";
            target.ResponseMs = Math.Max(30, target.ResponseMs - _random.Next(10, 50));
        }
    }

    private static SystemComponentHealthResponse CreateComponent(string name, string description)
    {
        var random = new Random(name.GetHashCode());
        return new SystemComponentHealthResponse
        {
            Name = name,
            Description = description,
            Status = "Operational",
            ResponseMs = random.Next(35, 120),
            Uptime90 = Enumerable.Range(0, 90).Select(_ => random.NextDouble() > 0.02 ? 1d : random.NextDouble() * 0.6).ToArray(),
        };
    }

    private static SystemComponentHealthResponse CloneComponent(SystemComponentHealthResponse source) =>
        new()
        {
            Name = source.Name,
            Description = source.Description,
            Status = source.Status,
            ResponseMs = source.ResponseMs,
            Uptime90 = source.Uptime90.ToArray(),
        };
}
