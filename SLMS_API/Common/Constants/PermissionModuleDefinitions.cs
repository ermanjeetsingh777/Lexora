using SLMS_API.Common.Enums;

namespace SLMS_API.Common.Constants;

public static class PermissionModuleDefinitions
{
    public static readonly string[] Modules =
    [
        "Dashboard",
        "Members",
        "Seats",
        "Attendance",
        "Institutions",
        "Branches",
        "Libraries",
        "Subscriptions",
        "Payments",
        "Books",
        "Inventory",
        "Users",
        "Roles",
        "Reports",
        "Notifications",
        "Profile",
        "Settings",
        "Support"
    ];

    public const int ActionsPerModule = 6;
    public const int AttendanceModuleIndex = 3;

    public static int GetBaseId(int moduleIndex) => moduleIndex * ActionsPerModule + 1;

    public static PermissionKey ToKey(int moduleIndex, int actionOffset) =>
        (PermissionKey)(GetBaseId(moduleIndex) + actionOffset);

    public static PermissionKey[] AllForModule(int moduleIndex) =>
        Enumerable.Range(0, ActionsPerModule).Select(i => ToKey(moduleIndex, i)).ToArray();

    public static PermissionKey[] ViewList(int moduleIndex) => [ToKey(moduleIndex, 0), ToKey(moduleIndex, 1)];

    public static PermissionKey[] ReadOnly(int moduleIndex) => ViewList(moduleIndex);

    public static PermissionKey[] FullCrud(int moduleIndex) => AllForModule(moduleIndex);

    public static PermissionKey[] ManageWithoutDelete(int moduleIndex) =>
        Enumerable.Range(0, ActionsPerModule - 1).Select(i => ToKey(moduleIndex, i)).ToArray();

    public static PermissionKey[] AllPermissions()
    {
        var values = Modules
            .SelectMany((_, index) => AllForModule(index))
            .Append(PermissionKey.AttendanceScannerUse)
            .Distinct()
            .ToArray();
        return values;
    }

    public static int ModuleIndex(string moduleName) =>
        Array.FindIndex(Modules, m => string.Equals(m, moduleName, StringComparison.OrdinalIgnoreCase));
}
