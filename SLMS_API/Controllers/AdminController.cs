using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Admin;
using SLMS_API.Application.Contracts.Admin.Requests;
using SLMS_API.Application.Contracts.Admin.Responses;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        IAdminService adminService,
        ICurrentUserService currentUserService,
        ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    [HttpGet("users")]
    [Permission(PermissionKey.UsersList)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AdminUserResponse>>>> GetUsers(
        [FromQuery] bool staffOnly = false,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<AdminUserResponse>>.Fail("User is not authenticated."));
        }

        try
        {
            var users = await _adminService.GetUsersAsync(userId, staffOnly, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<AdminUserResponse>>.Ok(users));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<AdminUserResponse>>.Fail(ex.Message));
        }
    }

    [HttpPost("users")]
    [Permission(PermissionKey.UsersCreate)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> CreateUser(
        [FromBody] AdminCreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<AdminUserResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var user = await _adminService.CreateUserAsync(request, userId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminUserResponse>.Ok(user, "User created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Admin create user failed for {Email}", request.Email);
            return BadRequest(ApiResponse<AdminUserResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("users/scope-options")]
    [Permission(PermissionKey.UsersList)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<InstitutionDropdownResponse>>>> GetUserScopeOptions(
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<InstitutionDropdownResponse>>.Fail("User is not authenticated."));
        }

        try
        {
            var options = await _adminService.GetUserScopeOptionsAsync(userId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<InstitutionDropdownResponse>>.Ok(options));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<InstitutionDropdownResponse>>.Fail(ex.Message));
        }
    }

    [HttpGet("users/{id}")]
    [Permission(PermissionKey.UsersView)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> GetUserById(string id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<AdminUserResponse>.Fail("User is not authenticated."));
        }

        var user = await _adminService.GetUserByIdAsync(id, userId, cancellationToken);
        if (user is null)
        {
            return NotFound(ApiResponse<AdminUserResponse>.Fail("User not found."));
        }

        return Ok(ApiResponse<AdminUserResponse>.Ok(user));
    }

    [HttpPut("users/{id}")]
    [Permission(PermissionKey.UsersUpdate)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> UpdateUser(
        string id,
        [FromBody] AdminUpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<AdminUserResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var user = await _adminService.UpdateUserAsync(id, request, userId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminUserResponse>.Ok(user, "User updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminUserResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("users/{id}/password")]
    [Permission(PermissionKey.UsersUpdate)]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ChangeUserPassword(
        string id,
        [FromBody] AdminChangeUserPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<MessageResponse>.Fail("User is not authenticated."));
        }

        try
        {
            await _adminService.ChangeUserPasswordAsync(id, request, userId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "User password updated successfully." }));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }

    [HttpDelete("users/{id}")]
    [Permission(PermissionKey.UsersDelete)]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> DeleteUser(string id, CancellationToken cancellationToken)
    {
        try
        {
            await _adminService.DeleteUserAsync(id, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = "User deleted successfully." }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("users/{id}/roles")]
    [Permission(PermissionKey.RolesUpdate)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> AssignRoles(
        string id,
        [FromBody] AdminAssignRolesRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<AdminUserResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var user = await _adminService.AssignRolesAsync(id, request, userId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminUserResponse>.Ok(user, "Roles updated successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AdminUserResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminUserResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("roles")]
    [Permission(PermissionKey.RolesList)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AdminRoleResponse>>>> GetRoles(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<AdminRoleResponse>>.Fail("User is not authenticated."));
        }

        try
        {
            var roles = await _adminService.GetRolesAsync(userId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<AdminRoleResponse>>.Ok(roles));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<AdminRoleResponse>>.Fail(ex.Message));
        }
    }

    [HttpPost("roles")]
    [Permission(PermissionKey.RolesCreate)]
    public async Task<ActionResult<ApiResponse<AdminRoleResponse>>> CreateRole(
        [FromBody] AdminCreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<AdminRoleResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var role = await _adminService.CreateRoleAsync(request, userId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminRoleResponse>.Ok(role, "Role created successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AdminRoleResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminRoleResponse>.Fail(ex.Message));
        }
    }

    [HttpPut("roles/{id}")]
    [Permission(PermissionKey.RolesUpdate)]
    public async Task<ActionResult<ApiResponse<AdminRoleResponse>>> UpdateRole(
        string id,
        [FromBody] AdminUpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<AdminRoleResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var role = await _adminService.UpdateRoleAsync(id, request, userId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminRoleResponse>.Ok(role, "Role updated successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AdminRoleResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminRoleResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("roles/{id}/permissions")]
    [Permission(PermissionKey.RolesView)]
    public async Task<ActionResult<ApiResponse<AdminRolePermissionsResponse>>> GetRolePermissions(
        string id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _adminService.GetRolePermissionsAsync(id, cancellationToken);
            return Ok(ApiResponse<AdminRolePermissionsResponse>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminRolePermissionsResponse>.Fail(ex.Message));
        }
    }

    [HttpPut("roles/{id}/permissions")]
    [Permission(PermissionKey.RolesUpdate)]
    public async Task<ActionResult<ApiResponse<AdminRolePermissionsResponse>>> AssignRolePermissions(
        string id,
        [FromBody] AdminAssignRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<AdminRolePermissionsResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var result = await _adminService.AssignRolePermissionsAsync(id, request, userId, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminRolePermissionsResponse>.Ok(result, "Role permissions updated successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AdminRolePermissionsResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminRolePermissionsResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("permissions")]
    [Permission(PermissionKey.RolesView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PermissionResponse>>>> GetPermissions(CancellationToken cancellationToken)
    {
        var permissions = await _adminService.GetPermissionsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<PermissionResponse>>.Ok(permissions));
    }

    [HttpGet("audit-logs")]
    [Permission(PermissionKey.ReportsView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AdminAuditLogResponse>>>> GetAuditLogs(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<AdminAuditLogResponse>>.Fail("User is not authenticated."));
        }

        try
        {
            var logs = await _adminService.GetAuditLogsAsync(userId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<AdminAuditLogResponse>>.Ok(logs));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<AdminAuditLogResponse>>.Fail(ex.Message));
        }
    }

    [HttpPost("backup")]
    [Permission(PermissionKey.SettingsUpdate)]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> Backup(CancellationToken cancellationToken)
    {
        try
        {
            var path = await _adminService.BackupAsync(_currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse { Message = $"Backup created: {path}" }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MessageResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("system-health")]
    [Permission(PermissionKey.DashboardView)]
    public async Task<ActionResult<ApiResponse<object>>> SystemHealth(CancellationToken cancellationToken)
    {
        var health = await _adminService.GetSystemHealthAsync(cancellationToken);
        return Ok(ApiResponse<object>.Ok(health));
    }

    #region Tenant Registration Approvals (SuperAdmin)

    [HttpGet("registrations")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<TenantRegistrationResponse>>>> GetRegistrations(
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var registrations = await _adminService.GetTenantRegistrationsAsync(status, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<TenantRegistrationResponse>>.Ok(registrations));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve tenant registrations");
            return BadRequest(ApiResponse<IReadOnlyCollection<TenantRegistrationResponse>>.Fail(ex.Message));
        }
    }

    [HttpGet("registrations/{userId}")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<TenantRegistrationResponse>>> GetRegistrationById(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var registration = await _adminService.GetTenantRegistrationByIdAsync(userId, cancellationToken);
        if (registration == null)
        {
            return NotFound(ApiResponse<TenantRegistrationResponse>.Fail("Registration request not found."));
        }

        return Ok(ApiResponse<TenantRegistrationResponse>.Ok(registration));
    }

    [HttpPost("registrations/{userId}/approve")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<TenantRegistrationResponse>>> ApproveRegistration(
        string userId,
        [FromBody] ApproveTenantRegistrationRequest request,
        CancellationToken cancellationToken = default)
    {
        var approverUserId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(approverUserId))
        {
            return Unauthorized(ApiResponse<TenantRegistrationResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var result = await _adminService.ApproveTenantRegistrationAsync(
                userId,
                request,
                approverUserId,
                _currentUserService.IpAddress,
                cancellationToken);

            return Ok(ApiResponse<TenantRegistrationResponse>.Ok(result, "Tenant registration approved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TenantRegistrationResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("registrations/{userId}/reject")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<TenantRegistrationResponse>>> RejectRegistration(
        string userId,
        [FromBody] RejectTenantRegistrationRequest request,
        CancellationToken cancellationToken = default)
    {
        var approverUserId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(approverUserId))
        {
            return Unauthorized(ApiResponse<TenantRegistrationResponse>.Fail("User is not authenticated."));
        }

        try
        {
            var result = await _adminService.RejectTenantRegistrationAsync(
                userId,
                request,
                approverUserId,
                _currentUserService.IpAddress,
                cancellationToken);

            return Ok(ApiResponse<TenantRegistrationResponse>.Ok(result, "Tenant registration rejected."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<TenantRegistrationResponse>.Fail(ex.Message));
        }
    }

    #endregion
}
