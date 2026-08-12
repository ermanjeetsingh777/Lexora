using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Infrastructure.Data;

public static class PermissionSeedData
{
    public static Permission[] GetAll() =>
    [
        Create(PermissionKey.DashboardView, "Dashboard View"),
        Create(PermissionKey.MembersView, "Members View"),
        Create(PermissionKey.MembersManage, "Members Manage"),
        Create(PermissionKey.SeatsView, "Seats View"),
        Create(PermissionKey.SeatsManage, "Seats Manage"),
        Create(PermissionKey.AttendanceView, "Attendance View"),
        Create(PermissionKey.AttendanceManage, "Attendance Manage"),
        Create(PermissionKey.AttendanceScannerUse, "Attendance Scanner Use"),
        Create(PermissionKey.InstitutionsManage, "Institutions Manage"),
        Create(PermissionKey.BranchesManage, "Branches Manage"),
        Create(PermissionKey.LibrariesManage, "Libraries Manage"),
        Create(PermissionKey.SubscriptionsView, "Subscriptions View"),
        Create(PermissionKey.SubscriptionsManage, "Subscriptions Manage"),
        Create(PermissionKey.PaymentsView, "Payments View"),
        Create(PermissionKey.BooksView, "Books View"),
        Create(PermissionKey.BooksManage, "Books Manage"),
        Create(PermissionKey.InventoryManage, "Inventory Manage"),
        Create(PermissionKey.UsersManage, "Users Manage"),
        Create(PermissionKey.RolesManage, "Roles Manage"),
        Create(PermissionKey.ReportsView, "Reports View"),
        Create(PermissionKey.NotificationsManage, "Notifications Manage"),
        Create(PermissionKey.ProfileView, "Profile View"),
        Create(PermissionKey.SettingsManage, "Settings Manage"),
        Create(PermissionKey.SupportView, "Support View")
    ];

    private static Permission Create(PermissionKey key, string name) =>
        new()
        {
            Id = (int)key,
            Code = key.ToClaimValue(),
            Name = name
        };
}
