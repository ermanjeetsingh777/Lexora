using System.Text.RegularExpressions;
using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public static class PermissionKeyExtensions
{
    private static readonly string[] Actions = ["View", "List", "Create", "Edit", "Update", "Delete"];

    public static string ToClaimValue(this PermissionKey permission)
    {
        if (permission == PermissionKey.AttendanceScannerUse)
        {
            return "attendance.scanner.use";
        }

        var name = permission.ToString();
        foreach (var action in Actions)
        {
            if (!name.EndsWith(action, StringComparison.Ordinal))
            {
                continue;
            }

            var module = name[..^action.Length];
            return $"{ToKebab(module)}.{action.ToLowerInvariant()}";
        }

        return ToKebab(name);
    }

    public static PermissionKey? FromClaimValue(string claimValue)
    {
        if (string.Equals(claimValue, "attendance.scanner.use", StringComparison.OrdinalIgnoreCase))
        {
            return PermissionKey.AttendanceScannerUse;
        }

        var parts = claimValue.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length != 2)
        {
            return null;
        }

        var module = ToPascal(parts[0]);
        var action = char.ToUpperInvariant(parts[1][0]) + parts[1][1..].ToLowerInvariant();
        if (!Actions.Contains(action))
        {
            return null;
        }

        var keyName = $"{module}{action}";
        return Enum.TryParse<PermissionKey>(keyName, true, out var key) ? key : null;
    }

    private static string ToKebab(string value) =>
        Regex.Replace(value, "([a-z0-9])([A-Z])", "$1.$2").ToLowerInvariant();

    private static string ToPascal(string value) =>
        string.Concat(value.Split('.', '_', '-').Select(part =>
            part.Length == 0 ? string.Empty : char.ToUpperInvariant(part[0]) + part[1..].ToLowerInvariant()));
}
