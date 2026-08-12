using SLMS_API.Common.Enums;

namespace SLMS_API.Infrastructure.Authorization;

public static class PermissionKeyExtensions
{
    public static string ToClaimValue(this PermissionKey permission) =>
        permission switch
        {
            PermissionKey.DashboardView => "dashboard.view",
            PermissionKey.MembersView => "members.view",
            PermissionKey.MembersManage => "members.manage",
            PermissionKey.SeatsView => "seats.view",
            PermissionKey.SeatsManage => "seats.manage",
            PermissionKey.AttendanceView => "attendance.view",
            PermissionKey.AttendanceManage => "attendance.manage",
            PermissionKey.AttendanceScannerUse => "attendance.scanner.use",
            PermissionKey.InstitutionsManage => "institutions.manage",
            PermissionKey.BranchesManage => "branches.manage",
            PermissionKey.LibrariesManage => "libraries.manage",
            PermissionKey.SubscriptionsView => "subscriptions.view",
            PermissionKey.SubscriptionsManage => "subscriptions.manage",
            PermissionKey.PaymentsView => "payments.view",
            PermissionKey.BooksView => "books.view",
            PermissionKey.BooksManage => "books.manage",
            PermissionKey.InventoryManage => "inventory.manage",
            PermissionKey.UsersManage => "users.manage",
            PermissionKey.RolesManage => "roles.manage",
            PermissionKey.ReportsView => "reports.view",
            PermissionKey.NotificationsManage => "notifications.manage",
            PermissionKey.ProfileView => "profile.view",
            PermissionKey.SettingsManage => "settings.manage",
            PermissionKey.SupportView => "support.view",
            _ => permission.ToString()
        };
}

