using SLMS_API.Application.Contracts.Admin.Requests;
using SLMS_API.Application.Contracts.Admin.Responses;

namespace SLMS_API.Application.Services.Interfaces;

public interface IAdminService
{
    Task<IReadOnlyCollection<AdminUserResponse>> GetUsersAsync(CancellationToken cancellationToken = default);
    Task<AdminUserResponse?> GetUserByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<AdminUserResponse> CreateUserAsync(AdminCreateUserRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminUserResponse> UpdateUserAsync(string id, AdminUpdateUserRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task DeleteUserAsync(string id, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminUserResponse> AssignRolesAsync(string id, AdminAssignRolesRequest request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AdminRoleResponse>> GetRolesAsync(CancellationToken cancellationToken = default);
    Task<AdminRoleResponse> CreateRoleAsync(AdminCreateRoleRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminRoleResponse> UpdateRoleAsync(string id, AdminUpdateRoleRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AdminRolePermissionsResponse> GetRolePermissionsAsync(string roleId, CancellationToken cancellationToken = default);
    Task<AdminRolePermissionsResponse> AssignRolePermissionsAsync(string roleId, AdminAssignRolePermissionsRequest request, string? ipAddress, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<PermissionResponse>> GetPermissionsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<AdminAuditLogResponse>> GetAuditLogsAsync(CancellationToken cancellationToken = default);

    Task<string> BackupAsync(string? ipAddress, CancellationToken cancellationToken = default);
    Task<object> GetSystemHealthAsync(CancellationToken cancellationToken = default);
}

