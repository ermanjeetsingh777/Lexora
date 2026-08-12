using SLMS_API.Common.Enums;

namespace SLMS_API.Common.Constants;

public static class RolePermissionDefinitions
{
    private static readonly PermissionKey[] AllPermissions = Enum.GetValues<PermissionKey>();

    private static readonly IReadOnlyDictionary<string, PermissionKey[]> Map =
        new Dictionary<string, PermissionKey[]>(StringComparer.OrdinalIgnoreCase)
        {
            [RoleDefinitions.SuperAdmin] = AllPermissions,
            [RoleDefinitions.OrganisationAdmin] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersManage,
                PermissionKey.AttendanceManage,
                PermissionKey.InstitutionsManage,
                PermissionKey.BranchesManage,
                PermissionKey.LibrariesManage,
                PermissionKey.SubscriptionsManage,
                PermissionKey.PaymentsView,
                PermissionKey.UsersManage,
                PermissionKey.RolesManage,
                PermissionKey.ReportsView,
                PermissionKey.NotificationsManage,
                PermissionKey.SettingsManage,
                PermissionKey.SupportView
            ],
            [RoleDefinitions.OrganisationManager] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersManage,
                PermissionKey.AttendanceManage,
                PermissionKey.InstitutionsManage,
                PermissionKey.BranchesManage,
                PermissionKey.LibrariesManage,
                PermissionKey.SubscriptionsManage,
                PermissionKey.PaymentsView,
                PermissionKey.UsersManage,
                PermissionKey.RolesManage,
                PermissionKey.ReportsView,
                PermissionKey.NotificationsManage,
                PermissionKey.SettingsManage,
                PermissionKey.SupportView
            ],
            [RoleDefinitions.InstitutionAdmin] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersManage,
                PermissionKey.AttendanceManage,
                PermissionKey.InstitutionsManage,
                PermissionKey.BranchesManage,
                PermissionKey.LibrariesManage,
                PermissionKey.SubscriptionsManage,
                PermissionKey.PaymentsView,
                PermissionKey.UsersManage,
                PermissionKey.RolesManage,
                PermissionKey.ReportsView,
                PermissionKey.NotificationsManage,
                PermissionKey.SettingsManage,
                PermissionKey.SupportView
            ],
            [RoleDefinitions.InstitutionManager] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersView,
                PermissionKey.MembersManage,
                PermissionKey.AttendanceView,
                PermissionKey.AttendanceManage,
                PermissionKey.InstitutionsManage,
                PermissionKey.BranchesManage,
                PermissionKey.LibrariesManage,
                PermissionKey.SubscriptionsView,
                PermissionKey.SubscriptionsManage,
                PermissionKey.PaymentsView,
                PermissionKey.BooksView,
                PermissionKey.InventoryManage,
                PermissionKey.ReportsView,
                PermissionKey.NotificationsManage,
                PermissionKey.ProfileView,
                PermissionKey.SupportView
            ],
            [RoleDefinitions.BranchAdmin] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersManage,
                PermissionKey.SeatsManage,
                PermissionKey.AttendanceManage,
                PermissionKey.BranchesManage,
                PermissionKey.LibrariesManage,
                PermissionKey.UsersManage,
                PermissionKey.ReportsView,
                PermissionKey.NotificationsManage,
                PermissionKey.SettingsManage
            ],
            [RoleDefinitions.BranchManager] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersView,
                PermissionKey.MembersManage,
                PermissionKey.SeatsView,
                PermissionKey.SeatsManage,
                PermissionKey.AttendanceView,
                PermissionKey.AttendanceManage,
                PermissionKey.BranchesManage,
                PermissionKey.LibrariesManage,
                PermissionKey.BooksView,
                PermissionKey.InventoryManage,
                PermissionKey.ReportsView,
                PermissionKey.NotificationsManage,
                PermissionKey.ProfileView
            ],
            [RoleDefinitions.LibrarianAdmin] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersManage,
                PermissionKey.SeatsManage,
                PermissionKey.AttendanceManage,
                PermissionKey.AttendanceScannerUse,
                PermissionKey.BranchesManage,
                PermissionKey.LibrariesManage,
                PermissionKey.BooksManage,
                PermissionKey.InventoryManage,
                PermissionKey.UsersManage,
                PermissionKey.ReportsView,
                PermissionKey.NotificationsManage
            ],
            [RoleDefinitions.LibrarianManager] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersView,
                PermissionKey.SeatsView,
                PermissionKey.AttendanceView,
                PermissionKey.AttendanceScannerUse,
                PermissionKey.LibrariesManage,
                PermissionKey.BooksView,
                PermissionKey.InventoryManage,
                PermissionKey.ReportsView,
                PermissionKey.ProfileView
            ],
            [RoleDefinitions.Librarians] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersView,
                PermissionKey.SeatsView,
                PermissionKey.AttendanceView,
                PermissionKey.AttendanceScannerUse,
                PermissionKey.BooksView,
                PermissionKey.InventoryManage,
                PermissionKey.ProfileView
            ],
            [RoleDefinitions.Teachers] =
            [
                PermissionKey.DashboardView,
                PermissionKey.BooksView,
                PermissionKey.ReportsView,
                PermissionKey.ProfileView
            ],
            [RoleDefinitions.Members] =
            [
                PermissionKey.DashboardView,
                PermissionKey.MembersView,
                PermissionKey.SeatsView,
                PermissionKey.AttendanceView,
                PermissionKey.BooksView,
                PermissionKey.ProfileView,
                PermissionKey.SupportView
            ]
        };

    public static IReadOnlyCollection<PermissionKey> GetPermissionsForRoles(IEnumerable<string> roles)
    {
        return roles
            .Where(Map.ContainsKey)
            .SelectMany(role => Map[role])
            .Distinct()
            .ToArray();
    }

    public static IReadOnlyDictionary<string, PermissionKey[]> GetDefaultRolePermissionMap() => Map;
}
