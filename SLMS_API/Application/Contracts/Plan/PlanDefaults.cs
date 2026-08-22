namespace SLMS_API.Application.Contracts.Plan;

public static class PlanDefaults
{
    public static readonly IReadOnlyCollection<string> DefaultPlanNames =
    [
        "Monthly",
        "Quarterly",
        "Half Yearly",
        "Yearly",
    ];

    public static bool IsDefaultPlanName(string? name) =>
        !string.IsNullOrWhiteSpace(name) &&
        DefaultPlanNames.Contains(name.Trim(), StringComparer.OrdinalIgnoreCase);
}
