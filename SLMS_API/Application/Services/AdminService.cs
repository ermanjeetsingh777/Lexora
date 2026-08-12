using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SLMS_API.Application.Contracts.Admin.Requests;
using SLMS_API.Application.Contracts.Admin.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Authorization;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class AdminService : IAdminService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ApplicationDbContext dbContext,
        IAuditLogService auditLogService,
        IConfiguration configuration,
        ILogger<AdminService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
        _auditLogService = auditLogService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<AdminUserResponse>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userManager.Users
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var result = new List<AdminUserResponse>(users.Count);
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(ToAdminUserResponse(user, roles));
        }

        return result;
    }

    public async Task<AdminUserResponse?> GetUserByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);
        return ToAdminUserResponse(user, roles);
    }

    public async Task<AdminUserResponse> CreateUserAsync(AdminCreateUserRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            IsActive = request.IsActive,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _auditLogService.WriteAsync(AuditEventTypes.Register, user.Id, "Admin created user", ipAddress, cancellationToken);

        var roles = await _userManager.GetRolesAsync(user);
        return ToAdminUserResponse(user, roles);
    }

    public async Task<AdminUserResponse> UpdateUserAsync(string id, AdminUpdateUserRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("User not found.");

        if (request.FullName is not null) user.FullName = request.FullName;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _auditLogService.WriteAsync("UserUpdate", user.Id, "Admin updated user", ipAddress, cancellationToken);

        var roles = await _userManager.GetRolesAsync(user);
        return ToAdminUserResponse(user, roles);
    }

    public async Task DeleteUserAsync(string id, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("User not found.");

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _auditLogService.WriteAsync("UserDelete", id, "Admin deleted user", ipAddress, cancellationToken);
    }

    public async Task<AdminUserResponse> AssignRolesAsync(string id, AdminAssignRolesRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("User not found.");

        var rolesToAssign = request.Roles
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        foreach (var role in rolesToAssign)
        {
            if (!RoleDefinitions.All.Contains(role, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Invalid role: {role}");
            }
        }

        var existingRoles = await _userManager.GetRolesAsync(user);
        var remove = existingRoles.Where(r => !rolesToAssign.Contains(r, StringComparer.OrdinalIgnoreCase)).ToArray();
        var add = rolesToAssign.Where(r => !existingRoles.Contains(r, StringComparer.OrdinalIgnoreCase)).ToArray();

        if (remove.Length > 0)
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, remove);
            if (!removeResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join("; ", removeResult.Errors.Select(e => e.Description)));
            }
        }

        if (add.Length > 0)
        {
            var addResult = await _userManager.AddToRolesAsync(user, add);
            if (!addResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join("; ", addResult.Errors.Select(e => e.Description)));
            }
        }

        await _auditLogService.WriteAsync(AuditEventTypes.RoleAssignment, user.Id, $"Roles updated to: {string.Join(",", rolesToAssign)}", ipAddress, cancellationToken);

        var roles = await _userManager.GetRolesAsync(user);
        return ToAdminUserResponse(user, roles);
    }

    public async Task<IReadOnlyCollection<AdminRoleResponse>> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _roleManager.Roles
            .OrderBy(x => x.Name)
            .Select(x => new AdminRoleResponse { Id = x.Id, Name = x.Name })
            .ToListAsync(cancellationToken);

        return roles;
    }

    public async Task<AdminRoleResponse> CreateRoleAsync(AdminCreateRoleRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (RoleDefinitions.All.Contains(request.Name, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("This role already exists in ROLE_DEFINITIONS.");
        }

        var result = await _roleManager.CreateAsync(new IdentityRole(request.Name));
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _auditLogService.WriteAsync("RoleCreate", null, $"Role created: {request.Name}", ipAddress, cancellationToken);

        var role = await _roleManager.FindByNameAsync(request.Name)
            ?? throw new InvalidOperationException("Role created but not found.");

        return new AdminRoleResponse { Id = role.Id, Name = role.Name };
    }

    public async Task<AdminRoleResponse> UpdateRoleAsync(string id, AdminUpdateRoleRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var role = await _roleManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("Role not found.");

        if (role.Name is not null && RoleDefinitions.All.Contains(role.Name, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Built-in roles from ROLE_DEFINITIONS cannot be renamed.");
        }

        role.Name = request.Name;
        var result = await _roleManager.UpdateAsync(role);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _auditLogService.WriteAsync("RoleUpdate", null, $"Role updated: {role.Id}", ipAddress, cancellationToken);

        return new AdminRoleResponse { Id = role.Id, Name = role.Name };
    }

    public async Task<AdminRolePermissionsResponse> GetRolePermissionsAsync(string roleId, CancellationToken cancellationToken = default)
    {
        var role = await _roleManager.FindByIdAsync(roleId)
            ?? throw new InvalidOperationException("Role not found.");

        var permissions = await _dbContext.RolePermissions
            .AsNoTracking()
            .Where(x => x.RoleId == roleId)
            .Join(_dbContext.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p)
            .OrderBy(x => x.Code)
            .Select(x => new PermissionResponse
            {
                Key = (PermissionKey)x.Id,
                Value = x.Code
            })
            .ToListAsync(cancellationToken);

        return new AdminRolePermissionsResponse
        {
            RoleId = role.Id,
            RoleName = role.Name,
            Permissions = permissions
        };
    }

    public async Task<AdminRolePermissionsResponse> AssignRolePermissionsAsync(
        string roleId,
        AdminAssignRolePermissionsRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var role = await _roleManager.FindByIdAsync(roleId)
            ?? throw new InvalidOperationException("Role not found.");

        var permissionIds = request.Permissions
            .Distinct()
            .Select(x => (int)x)
            .ToArray();

        var validPermissionIds = await _dbContext.Permissions
            .Where(x => permissionIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (validPermissionIds.Count != permissionIds.Length)
        {
            throw new InvalidOperationException("One or more permissions are invalid.");
        }

        var existing = await _dbContext.RolePermissions
            .Where(x => x.RoleId == roleId)
            .ToListAsync(cancellationToken);

        var toRemove = existing.Where(x => !validPermissionIds.Contains(x.PermissionId)).ToList();
        var existingIds = existing.Select(x => x.PermissionId).ToHashSet();
        var toAdd = validPermissionIds.Where(x => !existingIds.Contains(x)).ToList();

        if (toRemove.Count > 0)
        {
            _dbContext.RolePermissions.RemoveRange(toRemove);
        }

        foreach (var permissionId in toAdd)
        {
            _dbContext.RolePermissions.Add(new RolePermission
            {
                RoleId = roleId,
                PermissionId = permissionId
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogService.WriteAsync(
            AuditEventTypes.PermissionAssignment,
            null,
            $"Permissions updated for role {role.Name}: {string.Join(",", request.Permissions)}",
            ipAddress,
            cancellationToken);

        return await GetRolePermissionsAsync(roleId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<PermissionResponse>> GetPermissionsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Permissions
            .AsNoTracking()
            .OrderBy(x => x.Code)
            .Select(x => new PermissionResponse
            {
                Key = (PermissionKey)x.Id,
                Value = x.Code
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<AdminAuditLogResponse>> GetAuditLogsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.AuditLogs
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(500)
            .Select(x => new AdminAuditLogResponse
            {
                Id = x.Id,
                EventType = x.EventType,
                UserId = x.UserId,
                Details = x.Details,
                IpAddress = x.IpAddress,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<string> BackupAsync(string? ipAddress, CancellationToken cancellationToken = default)
    {
        var connectionString = _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is not configured.");

        var backupFolder = _configuration["Backup:FolderPath"];
        if (string.IsNullOrWhiteSpace(backupFolder))
        {
            throw new InvalidOperationException("Backup:FolderPath is not configured.");
        }

        var builder = new SqlConnectionStringBuilder(connectionString);
        if (string.IsNullOrWhiteSpace(builder.InitialCatalog))
        {
            throw new InvalidOperationException("Database name not found in connection string.");
        }

        var dbName = builder.InitialCatalog;
        var fileName = $"{dbName}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.bak";
        var filePath = Path.Combine(backupFolder, fileName);

        Directory.CreateDirectory(backupFolder);

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var sql = $"BACKUP DATABASE [{dbName}] TO DISK = @path WITH INIT, COPY_ONLY";
        await using var command = new SqlCommand(sql, connection)
        {
            CommandType = CommandType.Text
        };
        command.Parameters.AddWithValue("@path", filePath);

        await command.ExecuteNonQueryAsync(cancellationToken);

        await _auditLogService.WriteAsync("Backup", null, $"Database backup created: {fileName}", ipAddress, cancellationToken);
        _logger.LogInformation("Database backup created at {Path}", filePath);

        return filePath;
    }

    public async Task<object> GetSystemHealthAsync(CancellationToken cancellationToken = default)
    {
        var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
        return new
        {
            status = canConnect ? "Healthy" : "Unhealthy",
            database = new { canConnect }
        };
    }

    private static AdminUserResponse ToAdminUserResponse(ApplicationUser user, IEnumerable<string> roles)
    {
        return new AdminUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            UserName = user.UserName,
            FullName = user.FullName,
            IsActive = user.IsActive,
            TwoFactorEnabled = user.TwoFactorEnabled,
            Roles = roles.ToArray(),
            CreatedAtUtc = user.CreatedAtUtc
        };
    }
}

