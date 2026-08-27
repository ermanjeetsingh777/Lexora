using SLMS_API.Application.Contracts.Admin.Requests;
using SLMS_API.Application.Contracts.Admin.Responses;
using SLMS_API.Application.Contracts.Organizations.Requests;

namespace SLMS_API.Application.Services.Interfaces;

public interface IAdminService
{
    Task<IReadOnlyCollection<AdminUserResponse>> GetUsersAsync(string callerUserId, bool staffOnly = false, CancellationToken cancellationToken = default);
    Task<AdminUserResponse?> GetUserByIdAsync(string id, string callerUserId, CancellationToken cancellationToken = default);
    Task<AdminUserResponse> CreateUserAsync(AdminCreateUserRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminUserResponse> UpdateUserAsync(string id, AdminUpdateUserRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task ChangeUserPasswordAsync(string id, AdminChangeUserPasswordRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task DeleteUserAsync(string id, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminUserResponse> AssignRolesAsync(string id, AdminAssignRolesRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<InstitutionDropdownResponse>> GetUserScopeOptionsAsync(string callerUserId, CancellationToken cancellationToken = default);
    Task<AdminUserAccessScopeResponse> GetUserAccessScopeAsync(string userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AdminRoleResponse>> GetRolesAsync(string callerUserId, CancellationToken cancellationToken = default);
    Task<AdminRoleResponse> CreateRoleAsync(AdminCreateRoleRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminRoleResponse> UpdateRoleAsync(string id, AdminUpdateRoleRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminRolePermissionsResponse> GetRolePermissionsAsync(string roleId, CancellationToken cancellationToken = default);
    Task<AdminRolePermissionsResponse> AssignRolePermissionsAsync(string roleId, AdminAssignRolePermissionsRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<PermissionResponse>> GetPermissionsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<AdminAuditLogResponse>> GetAuditLogsAsync(string callerUserId, CancellationToken cancellationToken = default);

    Task<string> BackupAsync(string? ipAddress, CancellationToken cancellationToken = default);
    Task<object> GetSystemHealthAsync(CancellationToken cancellationToken = default);
}

