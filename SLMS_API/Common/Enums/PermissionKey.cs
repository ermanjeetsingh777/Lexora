namespace SLMS_API.Common.Enums;

/// <summary>
/// CRUD permissions per module: View, List, Create, Edit, Update, Delete (6 per module, IDs contiguous).
/// Special: <see cref="AttendanceScannerUse"/> = 109.
/// </summary>
public enum PermissionKey
{
    DashboardView = 1,
    DashboardList = 2,
    DashboardCreate = 3,
    DashboardEdit = 4,
    DashboardUpdate = 5,
    DashboardDelete = 6,

    MembersView = 7,
    MembersList = 8,
    MembersCreate = 9,
    MembersEdit = 10,
    MembersUpdate = 11,
    MembersDelete = 12,

    SeatsView = 13,
    SeatsList = 14,
    SeatsCreate = 15,
    SeatsEdit = 16,
    SeatsUpdate = 17,
    SeatsDelete = 18,

    AttendanceView = 19,
    AttendanceList = 20,
    AttendanceCreate = 21,
    AttendanceEdit = 22,
    AttendanceUpdate = 23,
    AttendanceDelete = 24,

    InstitutionsView = 25,
    InstitutionsList = 26,
    InstitutionsCreate = 27,
    InstitutionsEdit = 28,
    InstitutionsUpdate = 29,
    InstitutionsDelete = 30,

    BranchesView = 31,
    BranchesList = 32,
    BranchesCreate = 33,
    BranchesEdit = 34,
    BranchesUpdate = 35,
    BranchesDelete = 36,

    LibrariesView = 37,
    LibrariesList = 38,
    LibrariesCreate = 39,
    LibrariesEdit = 40,
    LibrariesUpdate = 41,
    LibrariesDelete = 42,

    SubscriptionsView = 43,
    SubscriptionsList = 44,
    SubscriptionsCreate = 45,
    SubscriptionsEdit = 46,
    SubscriptionsUpdate = 47,
    SubscriptionsDelete = 48,

    PaymentsView = 49,
    PaymentsList = 50,
    PaymentsCreate = 51,
    PaymentsEdit = 52,
    PaymentsUpdate = 53,
    PaymentsDelete = 54,

    BooksView = 55,
    BooksList = 56,
    BooksCreate = 57,
    BooksEdit = 58,
    BooksUpdate = 59,
    BooksDelete = 60,

    InventoryView = 61,
    InventoryList = 62,
    InventoryCreate = 63,
    InventoryEdit = 64,
    InventoryUpdate = 65,
    InventoryDelete = 66,

    UsersView = 67,
    UsersList = 68,
    UsersCreate = 69,
    UsersEdit = 70,
    UsersUpdate = 71,
    UsersDelete = 72,

    RolesView = 73,
    RolesList = 74,
    RolesCreate = 75,
    RolesEdit = 76,
    RolesUpdate = 77,
    RolesDelete = 78,

    ReportsView = 79,
    ReportsList = 80,
    ReportsCreate = 81,
    ReportsEdit = 82,
    ReportsUpdate = 83,
    ReportsDelete = 84,

    NotificationsView = 85,
    NotificationsList = 86,
    NotificationsCreate = 87,
    NotificationsEdit = 88,
    NotificationsUpdate = 89,
    NotificationsDelete = 90,

    ProfileView = 91,
    ProfileList = 92,
    ProfileCreate = 93,
    ProfileEdit = 94,
    ProfileUpdate = 95,
    ProfileDelete = 96,

    SettingsView = 97,
    SettingsList = 98,
    SettingsCreate = 99,
    SettingsEdit = 100,
    SettingsUpdate = 101,
    SettingsDelete = 102,

    SupportView = 103,
    SupportList = 104,
    SupportCreate = 105,
    SupportEdit = 106,
    SupportUpdate = 107,
    SupportDelete = 108,

    AttendanceScannerUse = 109,
}
