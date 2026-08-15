using SLMS_API.Common.Enums;
using SLMS_API.Common.Constants;

namespace SLMS_API.Common.Constants;

public static class RolePermissionDefinitions
{
    private static readonly PermissionKey[] AllPermissions = PermissionModuleDefinitions.AllPermissions();

    private static PermissionKey[] M(int moduleIndex) => PermissionModuleDefinitions.FullCrud(moduleIndex);
    private static PermissionKey[] R(int moduleIndex) => PermissionModuleDefinitions.ViewList(moduleIndex);
    private static PermissionKey[] V(int moduleIndex) => [PermissionModuleDefinitions.ToKey(moduleIndex, 0)];

    private static PermissionKey[] S(PermissionKey key) => [key];

    private static PermissionKey[] PlatformOperator() => Combine(
        R(0), M(1), M(2), M(3), S(PermissionKey.AttendanceScannerUse),
        M(4), M(5), M(6), M(7), R(8),
        M(9), M(10), M(11), M(12), R(13), M(14), R(15), M(16), R(17));

    private static PermissionKey[] InstitutionScope() => Combine(
        R(0), M(1), M(2), M(3), S(PermissionKey.AttendanceScannerUse),
        M(4), M(5), M(6), M(7), R(8), M(9), M(10), M(11), M(12), R(13), M(14), R(15), M(16), R(17));

    private static PermissionKey[] InstitutionOps() => Combine(
        R(0), R(1), M(1), R(2), M(2), R(3), M(3), S(PermissionKey.AttendanceScannerUse),
        M(4), M(5), M(6), R(7), M(7), R(8), R(9), M(10), R(13), M(14), R(15), R(17));

    private static PermissionKey[] BranchAdminScope() => Combine(
        R(0), M(1), M(2), M(3), M(5), M(6), M(11), R(13), M(14), M(16));

    private static PermissionKey[] BranchOps() => Combine(
        R(0), R(1), M(1), R(2), M(2), R(3), M(3), M(5), M(6), R(9), M(10), R(13), M(14), R(15));

    private static PermissionKey[] LibraryAdminScope() => Combine(
        R(0), M(1), M(2), M(3), S(PermissionKey.AttendanceScannerUse), M(5), M(6), M(9), M(10), M(11), R(13), M(14));

    private static PermissionKey[] LibraryOps() => Combine(
        R(0), R(1), R(2), R(3), S(PermissionKey.AttendanceScannerUse), M(6), R(9), M(10), R(13), R(15));

    private static PermissionKey[] LibraryStaff() => Combine(
        R(0), R(1), R(2), R(3), S(PermissionKey.AttendanceScannerUse), R(9), M(10), R(15));

    private static PermissionKey[] TeacherScope() => Combine(R(0), R(1), R(3), R(7), R(9), R(13), R(15));

    private static PermissionKey[] MemberPortal() => Combine(R(0), R(1), R(2), R(3), R(9), R(15), R(17));

    private static readonly IReadOnlyDictionary<string, PermissionKey[]> Map =
        new Dictionary<string, PermissionKey[]>(StringComparer.OrdinalIgnoreCase)
        {
            [RoleDefinitions.SuperAdmin] = AllPermissions,
            [RoleDefinitions.OrganisationAdmin] = PlatformOperator(),
            [RoleDefinitions.OrganisationManager] = PlatformOperator(),
            [RoleDefinitions.InstitutionAdmin] = InstitutionScope(),
            [RoleDefinitions.InstitutionManager] = InstitutionOps(),
            [RoleDefinitions.BranchAdmin] = BranchAdminScope(),
            [RoleDefinitions.BranchManager] = BranchOps(),
            [RoleDefinitions.LibrarianAdmin] = LibraryAdminScope(),
            [RoleDefinitions.LibrarianManager] = LibraryOps(),
            [RoleDefinitions.Librarians] = LibraryStaff(),
            [RoleDefinitions.Teachers] = TeacherScope(),
            [RoleDefinitions.Members] = MemberPortal(),
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

    private static PermissionKey[] Combine(params PermissionKey[][] sets) =>
        sets.SelectMany(x => x).Distinct().ToArray();
}
