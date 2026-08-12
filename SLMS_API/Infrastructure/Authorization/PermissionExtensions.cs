using System.Security.Claims;
using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public static class PermissionExtensions
{
    public static IReadOnlyCollection<PermissionKey> GetPermissions(this ClaimsPrincipal user)
    {
        return user.Claims
            .Where(x => x.Type == "permission")
            .Select(x => FromClaimValue(x.Value))
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .Distinct()
            .ToArray();
    }

    public static bool HasPermission(this ClaimsPrincipal user, PermissionKey permission)
    {
        var required = permission.ToClaimValue();
        return user.Claims.Any(x =>
            x.Type == "permission" &&
            string.Equals(x.Value, required, StringComparison.OrdinalIgnoreCase));
    }

    public static PermissionKey? FromClaimValue(string claimValue)
    {
        return claimValue.ToLowerInvariant() switch
        {
            "dashboard.view" => PermissionKey.DashboardView,
            "members.view" => PermissionKey.MembersView,
            "members.manage" => PermissionKey.MembersManage,
            "seats.view" => PermissionKey.SeatsView,
            "seats.manage" => PermissionKey.SeatsManage,
            "attendance.view" => PermissionKey.AttendanceView,
            "attendance.manage" => PermissionKey.AttendanceManage,
            "attendance.scanner.use" => PermissionKey.AttendanceScannerUse,
            "institutions.manage" => PermissionKey.InstitutionsManage,
            "branches.manage" => PermissionKey.BranchesManage,
            "libraries.manage" => PermissionKey.LibrariesManage,
            "subscriptions.view" => PermissionKey.SubscriptionsView,
            "subscriptions.manage" => PermissionKey.SubscriptionsManage,
            "payments.view" => PermissionKey.PaymentsView,
            "books.view" => PermissionKey.BooksView,
            "books.manage" => PermissionKey.BooksManage,
            "inventory.manage" => PermissionKey.InventoryManage,
            "users.manage" => PermissionKey.UsersManage,
            "roles.manage" => PermissionKey.RolesManage,
            "reports.view" => PermissionKey.ReportsView,
            "notifications.manage" => PermissionKey.NotificationsManage,
            "profile.view" => PermissionKey.ProfileView,
            "settings.manage" => PermissionKey.SettingsManage,
            "support.view" => PermissionKey.SupportView,
            _ => null
        };
    }
}
