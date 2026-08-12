using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Admin.Requests;
using SLMS_API.Application.Contracts.Admin.Responses;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;
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
    [Permission(PermissionKey.UsersManage)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AdminUserResponse>>>> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _adminService.GetUsersAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<AdminUserResponse>>.Ok(users));
    }

    [HttpPost("users")]
    [Permission(PermissionKey.UsersManage)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> CreateUser(
        [FromBody] AdminCreateUserRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _adminService.CreateUserAsync(request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminUserResponse>.Ok(user, "User created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Admin create user failed for {Email}", request.Email);
            return BadRequest(ApiResponse<AdminUserResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("users/{id}")]
    [Permission(PermissionKey.UsersManage)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> GetUserById(string id, CancellationToken cancellationToken)
    {
        var user = await _adminService.GetUserByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound(ApiResponse<AdminUserResponse>.Fail("User not found."));
        }

        return Ok(ApiResponse<AdminUserResponse>.Ok(user));
    }

    [HttpPut("users/{id}")]
    [Permission(PermissionKey.UsersManage)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> UpdateUser(
        string id,
        [FromBody] AdminUpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _adminService.UpdateUserAsync(id, request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminUserResponse>.Ok(user, "User updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminUserResponse>.Fail(ex.Message));
        }
    }

    [HttpDelete("users/{id}")]
    [Permission(PermissionKey.UsersManage)]
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
    [Permission(PermissionKey.RolesManage)]
    public async Task<ActionResult<ApiResponse<AdminUserResponse>>> AssignRoles(
        string id,
        [FromBody] AdminAssignRolesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _adminService.AssignRolesAsync(id, request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminUserResponse>.Ok(user, "Roles updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminUserResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("roles")]
    [Permission(PermissionKey.RolesManage)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AdminRoleResponse>>>> GetRoles(CancellationToken cancellationToken)
    {
        var roles = await _adminService.GetRolesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<AdminRoleResponse>>.Ok(roles));
    }

    [HttpPost("roles")]
    [Permission(PermissionKey.RolesManage)]
    public async Task<ActionResult<ApiResponse<AdminRoleResponse>>> CreateRole(
        [FromBody] AdminCreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var role = await _adminService.CreateRoleAsync(request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminRoleResponse>.Ok(role, "Role created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminRoleResponse>.Fail(ex.Message));
        }
    }

    [HttpPut("roles/{id}")]
    [Permission(PermissionKey.RolesManage)]
    public async Task<ActionResult<ApiResponse<AdminRoleResponse>>> UpdateRole(
        string id,
        [FromBody] AdminUpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var role = await _adminService.UpdateRoleAsync(id, request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminRoleResponse>.Ok(role, "Role updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminRoleResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("roles/{id}/permissions")]
    [Permission(PermissionKey.RolesManage)]
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
    [Permission(PermissionKey.RolesManage)]
    public async Task<ActionResult<ApiResponse<AdminRolePermissionsResponse>>> AssignRolePermissions(
        string id,
        [FromBody] AdminAssignRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _adminService.AssignRolePermissionsAsync(id, request, _currentUserService.IpAddress, cancellationToken);
            return Ok(ApiResponse<AdminRolePermissionsResponse>.Ok(result, "Role permissions updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AdminRolePermissionsResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("permissions")]
    [Permission(PermissionKey.RolesManage)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PermissionResponse>>>> GetPermissions(CancellationToken cancellationToken)
    {
        var permissions = await _adminService.GetPermissionsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<PermissionResponse>>.Ok(permissions));
    }

    [HttpGet("audit-logs")]
    [Permission(PermissionKey.ReportsView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AdminAuditLogResponse>>>> GetAuditLogs(CancellationToken cancellationToken)
    {
        var logs = await _adminService.GetAuditLogsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<AdminAuditLogResponse>>.Ok(logs));
    }

    [HttpPost("backup")]
    [Permission(PermissionKey.SettingsManage)]
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
}
