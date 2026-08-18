using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Application.Helpers;

public static class InstitutionUiHelper
{
    public static string ToCode(Guid id) => $"Inst_{id.ToString("N")[..6].ToUpperInvariant()}";

    public static string ToInitials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            return "IN";
        }

        if (parts.Length == 1)
        {
            return parts[0].Length >= 2
                ? parts[0][..2].ToUpperInvariant()
                : parts[0].ToUpperInvariant();
        }

        return $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[1][0])}";
    }

    public static string ToLocation(Institution institution)
    {
        if (!string.IsNullOrWhiteSpace(institution.City) && !string.IsNullOrWhiteSpace(institution.Country))
        {
            return $"{institution.City}, {institution.Country}";
        }

        return institution.City ?? institution.Country ?? institution.State ?? string.Empty;
    }

    public static string ToStatusLabel(bool isActive) => isActive ? "Active" : "Inactive";

    public static string ToLibraryStatusLabel(InstitutionStatus status, bool isActive)
    {
        if (!isActive)
        {
            return "Closed";
        }

        return status switch
        {
            InstitutionStatus.Active => "Active",
            InstitutionStatus.Maintenance => "Maintenance",
            InstitutionStatus.Closed => "Closed",
            InstitutionStatus.Inactive => "Closed",
            InstitutionStatus.Suspended => "Maintenance",
            InstitutionStatus.Pending => "Maintenance",
            _ => "Active"
        };
    }

    public static string ToBranchStatusLabel(InstitutionStatus status, bool isActive) =>
        ToLibraryStatusLabel(status, isActive);

    public static string ToHealthStatus(bool isActive, int branchCount) =>
        isActive && branchCount > 0 ? "Healthy" : isActive ? "Needs Attention" : "Inactive";

    public static int GetUpdateCount(DateTime createdAtUtc, DateTime? updatedAtUtc)
    {
        var updates = 1;
        if (updatedAtUtc.HasValue && updatedAtUtc.Value > createdAtUtc)
        {
            updates++;
        }

        return updates;
    }
}
