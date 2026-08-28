using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SLMS_API.Application.Contracts.Admin.Requests;
using SLMS_API.Application.Contracts.Admin.Responses;
using SLMS_API.Application.Contracts.Organizations.Requests;
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

    public async Task<IReadOnlyCollection<AdminUserResponse>> GetUsersAsync(string callerUserId, bool staffOnly = false, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var isSuperAdmin = await IsSuperAdminAsync(callerUserId, cancellationToken);
        IQueryable<ApplicationUser> usersQuery = _userManager.Users;

        if (!isSuperAdmin)
        {
            var allowedUserIds = await GetInstitutionScopedUserIdsAsync(callerUserId, cancellationToken);
            if (allowedUserIds.Count == 0)
            {
                return Array.Empty<AdminUserResponse>();
            }

            usersQuery = usersQuery.Where(u => allowedUserIds.Contains(u.Id));
        }

        var users = await usersQuery
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        HashSet<string>? memberLinkedUserIds = null;
        if (staffOnly)
        {
            memberLinkedUserIds = await _dbContext.Members
                .AsNoTracking()
                .Where(m => !m.IsDeleted && m.UserId != string.Empty)
                .Select(m => m.UserId)
                .ToHashSetAsync(cancellationToken);
        }

        var filteredUsers = new List<(ApplicationUser User, IList<string> Roles)>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);

            if (staffOnly && ShouldExcludeStaffUser(user.Id, roles, memberLinkedUserIds!))
            {
                continue;
            }

            filteredUsers.Add((user, roles));
        }

        var scopeMap = await LoadAccessScopesAsync(filteredUsers.Select(x => x.User.Id), cancellationToken);
        return filteredUsers
            .Select(x => ToAdminUserResponse(x.User, x.Roles, scopeMap.GetValueOrDefault(x.User.Id)))
            .ToList();
    }

    private static bool ShouldExcludeStaffUser(string userId, IList<string> roles, HashSet<string> memberLinkedUserIds)
    {
        if (roles.Contains(RoleDefinitions.Members, StringComparer.OrdinalIgnoreCase))
        {
            return true;
        }

        return memberLinkedUserIds.Contains(userId);
    }

    public async Task<AdminUserResponse?> GetUserByIdAsync(string id, string callerUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return null;
        }

        if (!await CanAccessUserAsync(callerUserId, user.Id, cancellationToken))
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);
        var scopeMap = await LoadAccessScopesAsync([user.Id], cancellationToken);
        return ToAdminUserResponse(user, roles, scopeMap.GetValueOrDefault(user.Id));
    }

    public async Task<AdminUserResponse> CreateUserAsync(AdminCreateUserRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        if (request.InstitutionScopes is null || request.InstitutionScopes.Count == 0)
        {
            throw new InvalidOperationException("At least one institution is required when creating a user.");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            IsActive = request.IsActive,
            EmailConfirmed = true,
            OnboardingStep = OnboardingStep.Completed
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await AssignUserAccessScopesAsync(
            user.Id,
            callerUserId,
            request.InstitutionScopes,
            cancellationToken);

        await _auditLogService.WriteAsync(AuditEventTypes.Register, user.Id, "Admin created user", ipAddress, cancellationToken);

        var roles = await _userManager.GetRolesAsync(user);
        var scopeMap = await LoadAccessScopesAsync([user.Id], cancellationToken);
        return ToAdminUserResponse(user, roles, scopeMap.GetValueOrDefault(user.Id));
    }

    private static readonly HashSet<string> StatusProtectedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        RoleDefinitions.SuperAdmin,
        RoleDefinitions.OrganisationAdmin
    };

    public async Task<AdminUserResponse> UpdateUserAsync(string id, AdminUpdateUserRequest request, string callerUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var user = await _userManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("User not found.");

        var roles = await _userManager.GetRolesAsync(user);

        if (request.IsActive is false)
        {
            EnsureCanDeactivateUser(user, roles, callerUserId);
        }

        if (request.FullName is not null) user.FullName = request.FullName;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        if (request.InstitutionScopes is { Count: > 0 })
        {
            await AssignUserAccessScopesAsync(
                user.Id,
                callerUserId,
                request.InstitutionScopes,
                cancellationToken);
        }

        await _auditLogService.WriteAsync("UserUpdate", user.Id, "Admin updated user", ipAddress, cancellationToken);

        var scopeMap = await LoadAccessScopesAsync([user.Id], cancellationToken);
        return ToAdminUserResponse(user, roles, scopeMap.GetValueOrDefault(user.Id));
    }

    public async Task ChangeUserPasswordAsync(
        string id,
        AdminChangeUserPasswordRequest request,
        string callerUserId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        if (!await CanChangeAccountPasswordAsync(callerUserId, cancellationToken))
        {
            throw new UnauthorizedAccessException("Only SuperAdmin or OrganisationAdmin can change user passwords.");
        }

        if (!await CanAccessUserAsync(callerUserId, id, cancellationToken))
        {
            throw new InvalidOperationException("User not found.");
        }

        var user = await _userManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("User not found.");

        var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, resetToken, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _auditLogService.WriteAsync(
            AuditEventTypes.PasswordReset,
            user.Id,
            $"Admin changed password for user {user.Email}",
            ipAddress,
            cancellationToken);
    }

    private static void EnsureCanDeactivateUser(ApplicationUser user, IList<string> roles, string callerUserId)
    {
        if (string.Equals(user.Id, callerUserId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("You cannot deactivate your own account.");
        }

        if (roles.Any(StatusProtectedRoles.Contains))
        {
            throw new InvalidOperationException("SuperAdmin and OrganisationAdmin accounts cannot be deactivated.");
        }
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

    public async Task<AdminUserResponse> AssignRolesAsync(
        string id,
        AdminAssignRolesRequest request,
        string callerUserId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        if (!await CanManageCustomRolesAsync(callerUserId, cancellationToken))
        {
            throw new UnauthorizedAccessException("Only SuperAdmin or OrganisationAdmin can change user roles.");
        }

        var user = await _userManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("User not found.");

        var rolesToAssign = request.Roles
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        foreach (var role in rolesToAssign)
        {
            await EnsureRoleIsAssignableAsync(role, cancellationToken);
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
        var scopeMap = await LoadAccessScopesAsync([user.Id], cancellationToken);
        return ToAdminUserResponse(user, roles, scopeMap.GetValueOrDefault(user.Id));
    }

    public async Task<IReadOnlyCollection<AdminRoleResponse>> GetRolesAsync(string callerUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var identityRoles = await _roleManager.Roles
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var roleInstitutionMap = await GetRoleInstitutionMapAsync(cancellationToken);
        var isSuperAdmin = await IsSuperAdminAsync(callerUserId, cancellationToken);

        if (isSuperAdmin)
        {
            return identityRoles
                .Select(role => ToAdminRoleResponse(role, roleInstitutionMap))
                .ToList();
        }

        var callerInstitutionIds = await GetCallerInstitutionIdsAsync(callerUserId, cancellationToken);

        return identityRoles
            .Where(role => CanCallerViewRole(role.Name, role.Id, roleInstitutionMap, callerInstitutionIds))
            .Select(role => ToAdminRoleResponse(role, roleInstitutionMap))
            .ToList();
    }

    public async Task<AdminRoleResponse> CreateRoleAsync(
        AdminCreateRoleRequest request,
        string callerUserId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        if (!await CanManageCustomRolesAsync(callerUserId, cancellationToken))
        {
            throw new UnauthorizedAccessException("Only SuperAdmin or OrganisationAdmin can create custom roles.");
        }

        if (RoleDefinitions.All.Contains(request.Name, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("This role already exists in ROLE_DEFINITIONS.");
        }

        var institutionIds = await ResolveRoleInstitutionIdsForCreateAsync(
            request.InstitutionIds,
            callerUserId,
            cancellationToken);

        var result = await _roleManager.CreateAsync(new IdentityRole(request.Name));
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        var role = await _roleManager.FindByNameAsync(request.Name)
            ?? throw new InvalidOperationException("Role created but not found.");

        foreach (var institutionId in institutionIds)
        {
            _dbContext.RoleInstitutions.Add(new RoleInstitution
            {
                RoleId = role.Id,
                InstitutionId = institutionId,
                CreatedByUserId = callerUserId,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await ApplyClonedPermissionsAsync(
            role.Id,
            request.CloneFromRoleId,
            request.ClonePermissionKeys,
            callerUserId,
            cancellationToken);

        await _auditLogService.WriteAsync("RoleCreate", null, $"Role created: {request.Name}", ipAddress, cancellationToken);

        var roleInstitutionMap = await GetRoleInstitutionMapAsync(cancellationToken);
        return ToAdminRoleResponse(role, roleInstitutionMap);
    }

    public async Task<AdminRoleResponse> UpdateRoleAsync(
        string id,
        AdminUpdateRoleRequest request,
        string callerUserId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var role = await _roleManager.FindByIdAsync(id)
            ?? throw new InvalidOperationException("Role not found.");

        if (!await IsSuperAdminAsync(callerUserId, cancellationToken))
        {
            if (!await IsOrganisationAdminAsync(callerUserId, cancellationToken))
            {
                throw new UnauthorizedAccessException("Only SuperAdmin or OrganisationAdmin can update roles.");
            }

            if (IsBuiltInRole(role.Name))
            {
                throw new InvalidOperationException("Built-in roles cannot be renamed.");
            }

            await EnsureCallerCanAccessCustomRoleAsync(callerUserId, role, cancellationToken);
        }

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

        var roleInstitutionMap = await GetRoleInstitutionMapAsync(cancellationToken);
        return ToAdminRoleResponse(role, roleInstitutionMap);
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
        string callerUserId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var role = await _roleManager.FindByIdAsync(roleId)
            ?? throw new InvalidOperationException("Role not found.");

        await EnsureCanManageRolePermissionsAsync(callerUserId, role, cancellationToken);
        await EnsureCallerCanAccessCustomRoleAsync(callerUserId, role, cancellationToken);

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

    private static readonly HashSet<string> GovernanceAuditEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        AuditEventTypes.Register,
        "UserUpdate",
        "UserDelete",
        AuditEventTypes.RoleAssignment,
        AuditEventTypes.Login,
        AuditEventTypes.Logout,
        AuditEventTypes.PasswordReset,
    };

    public async Task<IReadOnlyCollection<AdminAuditLogResponse>> GetAuditLogsAsync(string callerUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var query = _dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (!await IsSuperAdminAsync(callerUserId, cancellationToken))
        {
            var allowedUserIds = await GetInstitutionScopedUserIdsAsync(callerUserId, cancellationToken);
            allowedUserIds.Add(callerUserId);

            query = query.Where(x =>
                x.UserId != null
                && allowedUserIds.Contains(x.UserId)
                && GovernanceAuditEventTypes.Contains(x.EventType));
        }

        return await query
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

    public async Task<IReadOnlyCollection<InstitutionDropdownResponse>> GetUserScopeOptionsAsync(string callerUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        if (await IsSuperAdminAsync(callerUserId, cancellationToken))
        {
            return await BuildFullInstitutionDropdownAsync(cancellationToken);
        }

        return await BuildScopedInstitutionDropdownAsync(callerUserId, cancellationToken);
    }

    public async Task<AdminUserAccessScopeResponse> GetUserAccessScopeAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new AdminUserAccessScopeResponse { Summary = "None" };
        }

        var scopeMap = await LoadAccessScopesAsync([userId], cancellationToken);
        return scopeMap.GetValueOrDefault(userId) ?? new AdminUserAccessScopeResponse { Summary = "None" };
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

    private static readonly HashSet<string> NonAssignableRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        RoleDefinitions.SuperAdmin,
        RoleDefinitions.Members,
    };

    private static readonly HashSet<string> DefaultAdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        RoleDefinitions.OrganisationAdmin,
        RoleDefinitions.InstitutionAdmin,
        RoleDefinitions.BranchAdmin,
        RoleDefinitions.LibrarianAdmin,
    };

    private static bool IsBuiltInRole(string? roleName) =>
        roleName is not null && RoleDefinitions.All.Contains(roleName, StringComparer.OrdinalIgnoreCase);

    private static bool IsCustomRole(string? roleName) =>
        roleName is not null && !IsBuiltInRole(roleName);

    private static bool IsDefaultAdminRole(string? roleName) =>
        roleName is not null && DefaultAdminRoles.Contains(roleName);

    private async Task<bool> CanManageCustomRolesAsync(string callerUserId, CancellationToken cancellationToken) =>
        await IsSuperAdminAsync(callerUserId, cancellationToken)
        || await IsOrganisationAdminAsync(callerUserId, cancellationToken);

    private async Task EnsureRoleIsAssignableAsync(string roleName, CancellationToken cancellationToken)
    {
        if (NonAssignableRoles.Contains(roleName))
        {
            throw new InvalidOperationException($"{roleName} role cannot be assigned through user management.");
        }

        if (IsBuiltInRole(roleName))
        {
            return;
        }

        if (await _roleManager.RoleExistsAsync(roleName))
        {
            return;
        }

        throw new InvalidOperationException($"Invalid role: {roleName}");
    }

    private async Task EnsureCanManageRolePermissionsAsync(
        string callerUserId,
        IdentityRole role,
        CancellationToken cancellationToken)
    {
        if (await IsSuperAdminAsync(callerUserId, cancellationToken))
        {
            return;
        }

        if (!await IsOrganisationAdminAsync(callerUserId, cancellationToken))
        {
            throw new UnauthorizedAccessException("Only SuperAdmin or OrganisationAdmin can manage role permissions.");
        }

        if (string.Equals(role.Name, RoleDefinitions.SuperAdmin, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("SuperAdmin role permissions cannot be modified.");
        }

        if (IsCustomRole(role.Name) || IsDefaultAdminRole(role.Name))
        {
            return;
        }

        throw new InvalidOperationException("You can only modify custom roles or default admin roles.");
    }

    private async Task<List<Guid>> GetCallerInstitutionIdsAsync(string callerUserId, CancellationToken cancellationToken)
    {
        var institutionIds = await _dbContext.UserInstitutions
            .AsNoTracking()
            .Where(ui => ui.UserId == callerUserId && ui.IsActive)
            .Select(ui => ui.InstitutionId)
            .ToListAsync(cancellationToken);

        var branchInstitutionIds = await _dbContext.UserBranches
            .AsNoTracking()
            .Where(ub => ub.UserId == callerUserId && ub.IsActive)
            .Select(ub => ub.InstitutionId)
            .ToListAsync(cancellationToken);

        var libraryInstitutionIds = await _dbContext.UserLibraries
            .AsNoTracking()
            .Where(ul => ul.UserId == callerUserId && ul.IsActive)
            .Select(ul => ul.InstitutionId)
            .ToListAsync(cancellationToken);

        return institutionIds
            .Concat(branchInstitutionIds)
            .Concat(libraryInstitutionIds)
            .Distinct()
            .ToList();
    }

    private async Task<Dictionary<string, List<Guid>>> GetRoleInstitutionMapAsync(CancellationToken cancellationToken)
    {
        var rows = await _dbContext.RoleInstitutions
            .AsNoTracking()
            .Select(x => new { x.RoleId, x.InstitutionId })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.RoleId, StringComparer.Ordinal)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.InstitutionId).Distinct().ToList(),
                StringComparer.Ordinal);
    }

    private static AdminRoleResponse ToAdminRoleResponse(
        IdentityRole role,
        IReadOnlyDictionary<string, List<Guid>> roleInstitutionMap)
    {
        roleInstitutionMap.TryGetValue(role.Id, out var institutionIds);

        return new AdminRoleResponse
        {
            Id = role.Id,
            Name = role.Name,
            IsSystem = IsBuiltInRole(role.Name),
            InstitutionIds = institutionIds ?? []
        };
    }

    private static bool CanCallerViewRole(
        string? roleName,
        string roleId,
        IReadOnlyDictionary<string, List<Guid>> roleInstitutionMap,
        IReadOnlyCollection<Guid> callerInstitutionIds)
    {
        if (string.Equals(roleName, RoleDefinitions.SuperAdmin, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (IsBuiltInRole(roleName))
        {
            return true;
        }

        if (!roleInstitutionMap.TryGetValue(roleId, out var scopedInstitutionIds) || scopedInstitutionIds.Count == 0)
        {
            return false;
        }

        return scopedInstitutionIds.Any(callerInstitutionIds.Contains);
    }

    private async Task<List<Guid>> ResolveRoleInstitutionIdsForCreateAsync(
        IReadOnlyCollection<Guid>? requestedInstitutionIds,
        string callerUserId,
        CancellationToken cancellationToken)
    {
        var callerInstitutionIds = await GetCallerInstitutionIdsAsync(callerUserId, cancellationToken);
        var isSuperAdmin = await IsSuperAdminAsync(callerUserId, cancellationToken);

        if (requestedInstitutionIds is { Count: > 0 })
        {
            var normalized = requestedInstitutionIds.Distinct().ToList();
            if (!isSuperAdmin)
            {
                if (normalized.Any(id => !callerInstitutionIds.Contains(id)))
                {
                    throw new InvalidOperationException("You do not have access to one or more selected institutions.");
                }
            }

            return normalized;
        }

        if (isSuperAdmin)
        {
            return [];
        }

        if (callerInstitutionIds.Count == 0)
        {
            throw new InvalidOperationException("Institution scope is required to create a custom role.");
        }

        return callerInstitutionIds;
    }

    private async Task ApplyClonedPermissionsAsync(
        string newRoleId,
        string? cloneFromRoleId,
        IReadOnlyCollection<int>? clonePermissionKeys,
        string callerUserId,
        CancellationToken cancellationToken)
    {
        IReadOnlyCollection<int> permissionIds;

        if (!string.IsNullOrWhiteSpace(cloneFromRoleId))
        {
            var sourceRole = await _roleManager.FindByIdAsync(cloneFromRoleId)
                ?? throw new InvalidOperationException("Source role for clone was not found.");

            if (string.Equals(sourceRole.Name, RoleDefinitions.SuperAdmin, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("SuperAdmin role cannot be cloned.");
            }

            if (!await IsSuperAdminAsync(callerUserId, cancellationToken))
            {
                var roleInstitutionMap = await GetRoleInstitutionMapAsync(cancellationToken);
                var callerInstitutionIds = await GetCallerInstitutionIdsAsync(callerUserId, cancellationToken);
                if (!CanCallerViewRole(sourceRole.Name, sourceRole.Id, roleInstitutionMap, callerInstitutionIds))
                {
                    throw new UnauthorizedAccessException("You do not have access to clone this role.");
                }
            }

            permissionIds = await _dbContext.RolePermissions
                .AsNoTracking()
                .Where(x => x.RoleId == cloneFromRoleId)
                .Select(x => x.PermissionId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (permissionIds.Count == 0
                && sourceRole.Name is not null
                && RolePermissionDefinitions.GetDefaultRolePermissionMap().TryGetValue(sourceRole.Name, out var defaults))
            {
                permissionIds = defaults.Select(x => (int)x).ToArray();
            }
        }
        else if (clonePermissionKeys is { Count: > 0 })
        {
            permissionIds = clonePermissionKeys.Distinct().ToArray();
        }
        else
        {
            return;
        }

        if (permissionIds.Count == 0)
        {
            return;
        }

        var validPermissionIds = await _dbContext.Permissions
            .AsNoTracking()
            .Where(x => permissionIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (validPermissionIds.Count != permissionIds.Count)
        {
            throw new InvalidOperationException("One or more permissions are invalid.");
        }

        foreach (var permissionId in validPermissionIds)
        {
            _dbContext.RolePermissions.Add(new RolePermission
            {
                RoleId = newRoleId,
                PermissionId = permissionId
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureCallerCanAccessCustomRoleAsync(
        string callerUserId,
        IdentityRole role,
        CancellationToken cancellationToken)
    {
        if (await IsSuperAdminAsync(callerUserId, cancellationToken) || IsBuiltInRole(role.Name))
        {
            return;
        }

        var roleInstitutionIds = await _dbContext.RoleInstitutions
            .AsNoTracking()
            .Where(x => x.RoleId == role.Id)
            .Select(x => x.InstitutionId)
            .ToListAsync(cancellationToken);

        if (roleInstitutionIds.Count == 0)
        {
            throw new UnauthorizedAccessException("Only SuperAdmin can manage platform-wide custom roles.");
        }

        var callerInstitutionIds = await GetCallerInstitutionIdsAsync(callerUserId, cancellationToken);
        if (!roleInstitutionIds.Any(callerInstitutionIds.Contains))
        {
            throw new UnauthorizedAccessException("You do not have access to manage this role.");
        }
    }

    private async Task<bool> IsSuperAdminAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        return user is not null && await _userManager.IsInRoleAsync(user, RoleDefinitions.SuperAdmin);
    }

    private async Task<bool> IsOrganisationAdminAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(userId);
        return user is not null && await _userManager.IsInRoleAsync(user, RoleDefinitions.OrganisationAdmin);
    }

    private async Task<bool> CanChangeAccountPasswordAsync(string userId, CancellationToken cancellationToken)
    {
        return await IsSuperAdminAsync(userId, cancellationToken)
            || await IsOrganisationAdminAsync(userId, cancellationToken);
    }

    private async Task<HashSet<string>> GetInstitutionScopedUserIdsAsync(string callerUserId, CancellationToken cancellationToken)
    {
        var institutionIds = await _dbContext.UserInstitutions
            .AsNoTracking()
            .Where(ui => ui.UserId == callerUserId && ui.IsActive)
            .Select(ui => ui.InstitutionId)
            .ToListAsync(cancellationToken);

        var branchInstitutionIds = await _dbContext.UserBranches
            .AsNoTracking()
            .Where(ub => ub.UserId == callerUserId && ub.IsActive)
            .Select(ub => ub.InstitutionId)
            .ToListAsync(cancellationToken);

        var libraryInstitutionIds = await _dbContext.UserLibraries
            .AsNoTracking()
            .Where(ul => ul.UserId == callerUserId && ul.IsActive)
            .Select(ul => ul.InstitutionId)
            .ToListAsync(cancellationToken);

        institutionIds = institutionIds
            .Concat(branchInstitutionIds)
            .Concat(libraryInstitutionIds)
            .Distinct()
            .ToList();

        if (institutionIds.Count == 0)
        {
            return [];
        }

        var userIds = new HashSet<string>(StringComparer.Ordinal);

        var institutionUserIds = await _dbContext.UserInstitutions
            .AsNoTracking()
            .Where(ui => ui.IsActive && institutionIds.Contains(ui.InstitutionId))
            .Select(ui => ui.UserId)
            .ToListAsync(cancellationToken);

        var branchUserIds = await _dbContext.UserBranches
            .AsNoTracking()
            .Where(ub => ub.IsActive && institutionIds.Contains(ub.InstitutionId))
            .Select(ub => ub.UserId)
            .ToListAsync(cancellationToken);

        var libraryUserIds = await _dbContext.UserLibraries
            .AsNoTracking()
            .Where(ul => ul.IsActive && institutionIds.Contains(ul.InstitutionId))
            .Select(ul => ul.UserId)
            .ToListAsync(cancellationToken);

        foreach (var id in institutionUserIds.Concat(branchUserIds).Concat(libraryUserIds))
        {
            userIds.Add(id);
        }

        return userIds;
    }

    private async Task<bool> CanAccessUserAsync(string callerUserId, string targetUserId, CancellationToken cancellationToken)
    {
        if (await IsSuperAdminAsync(callerUserId, cancellationToken))
        {
            return true;
        }

        var allowedUserIds = await GetInstitutionScopedUserIdsAsync(callerUserId, cancellationToken);
        return allowedUserIds.Contains(targetUserId);
    }

    private static AdminUserResponse ToAdminUserResponse(
        ApplicationUser user,
        IEnumerable<string> roles,
        AdminUserAccessScopeResponse? accessScope = null)
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
            CreatedAtUtc = user.CreatedAtUtc,
            AccessScope = accessScope
        };
    }

    private async Task<Dictionary<string, AdminUserAccessScopeResponse>> LoadAccessScopesAsync(
        IEnumerable<string> userIds,
        CancellationToken cancellationToken)
    {
        var ids = userIds.Distinct(StringComparer.Ordinal).ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<string, AdminUserAccessScopeResponse>(StringComparer.Ordinal);
        }

        var institutions = await _dbContext.UserInstitutions
            .AsNoTracking()
            .Where(ui => ui.IsActive && ids.Contains(ui.UserId))
            .Include(ui => ui.Institution)
            .ToListAsync(cancellationToken);

        var branches = await _dbContext.UserBranches
            .AsNoTracking()
            .Where(ub => ub.IsActive && ids.Contains(ub.UserId))
            .Include(ub => ub.Branch)
            .ToListAsync(cancellationToken);

        var libraries = await _dbContext.UserLibraries
            .AsNoTracking()
            .Where(ul => ul.IsActive && ids.Contains(ul.UserId))
            .Include(ul => ul.Library)
            .ToListAsync(cancellationToken);

        var result = new Dictionary<string, AdminUserAccessScopeResponse>(StringComparer.Ordinal);
        foreach (var userId in ids)
        {
            var userInstitutions = institutions.Where(x => x.UserId == userId).ToList();
            var userBranches = branches.Where(x => x.UserId == userId).ToList();
            var userLibraries = libraries.Where(x => x.UserId == userId).ToList();
            result[userId] = BuildAccessScopeResponse(userInstitutions, userBranches, userLibraries);
        }

        return result;
    }

    private static AdminUserAccessScopeResponse BuildAccessScopeResponse(
        IReadOnlyCollection<UserInstitution> institutionMappings,
        IReadOnlyCollection<UserBranch> branchMappings,
        IReadOnlyCollection<UserLibrary> libraryMappings)
    {
        if (institutionMappings.Count == 0 && branchMappings.Count == 0 && libraryMappings.Count == 0)
        {
            return new AdminUserAccessScopeResponse { Summary = "Platform" };
        }

        var primaryInstitution = institutionMappings
            .OrderByDescending(x => x.IsPrimary)
            .FirstOrDefault();

        var institutionScopes = institutionMappings
            .OrderByDescending(x => x.IsPrimary)
            .ThenBy(x => x.Institution?.Name)
            .Select(inst => new AdminUserInstitutionScopeResponse
            {
                InstitutionId = inst.InstitutionId,
                InstitutionName = inst.Institution?.Name ?? "Institution",
                Branches = branchMappings
                    .Where(x => x.InstitutionId == inst.InstitutionId)
                    .Select(x => new AdminUserScopeItemResponse { Id = x.BranchId, Name = x.Branch?.Name ?? "Branch" })
                    .DistinctBy(x => x.Id)
                    .ToArray(),
                Libraries = libraryMappings
                    .Where(x => x.InstitutionId == inst.InstitutionId)
                    .Select(x => new AdminUserScopeItemResponse { Id = x.LibraryId, Name = x.Library?.Name ?? "Library" })
                    .DistinctBy(x => x.Id)
                    .ToArray()
            })
            .ToArray();

        var branchItems = branchMappings
            .Select(x => new AdminUserScopeItemResponse { Id = x.BranchId, Name = x.Branch?.Name ?? "Branch" })
            .DistinctBy(x => x.Id)
            .ToArray();
        var libraryItems = libraryMappings
            .Select(x => new AdminUserScopeItemResponse { Id = x.LibraryId, Name = x.Library?.Name ?? "Library" })
            .DistinctBy(x => x.Id)
            .ToArray();

        var summaryParts = new List<string>();
        if (institutionScopes.Length > 1)
        {
            summaryParts.Add($"{institutionScopes.Length} institutions");
        }
        else if (institutionScopes.Length == 1)
        {
            summaryParts.Add(institutionScopes[0].InstitutionName);
        }
        else if (!string.IsNullOrWhiteSpace(primaryInstitution?.Institution?.Name))
        {
            summaryParts.Add(primaryInstitution.Institution.Name);
        }

        if (branchItems.Length > 0)
        {
            summaryParts.Add($"{branchItems.Length} branch{(branchItems.Length == 1 ? "" : "es")}");
        }

        if (libraryItems.Length > 0)
        {
            summaryParts.Add($"{libraryItems.Length} librar{(libraryItems.Length == 1 ? "y" : "ies")}");
        }

        return new AdminUserAccessScopeResponse
        {
            InstitutionId = primaryInstitution?.InstitutionId,
            InstitutionName = primaryInstitution?.Institution?.Name,
            InstitutionScopes = institutionScopes,
            Branches = branchItems,
            Libraries = libraryItems,
            Summary = summaryParts.Count > 0 ? string.Join(" · ", summaryParts) : "Platform"
        };
    }

    private async Task AssignUserAccessScopesAsync(
        string targetUserId,
        string callerUserId,
        IReadOnlyCollection<AdminUserInstitutionScopeRequest> scopes,
        CancellationToken cancellationToken)
    {
        if (scopes.Count == 0)
        {
            throw new InvalidOperationException("At least one institution is required.");
        }

        foreach (var scope in scopes)
        {
            await EnsureCallerCanAssignScopeAsync(callerUserId, scope.InstitutionId, cancellationToken);
        }

        await RemoveUserAccessScopeAsync(targetUserId, cancellationToken);

        var isFirstInstitution = true;
        foreach (var scope in scopes)
        {
            await AddUserAccessScopeForInstitutionAsync(
                targetUserId,
                scope.InstitutionId,
                scope.BranchIds ?? [],
                scope.LibraryIds ?? [],
                isFirstInstitution,
                cancellationToken);
            isFirstInstitution = false;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task AddUserAccessScopeForInstitutionAsync(
        string targetUserId,
        Guid institutionId,
        IReadOnlyCollection<Guid> branchIds,
        IReadOnlyCollection<Guid> libraryIds,
        bool isPrimaryInstitution,
        CancellationToken cancellationToken)
    {
        var institution = await _dbContext.Institutions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == institutionId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Institution not found.");

        var normalizedBranchIds = branchIds.Distinct().ToArray();
        var normalizedLibraryIds = libraryIds.Distinct().ToArray();

        var branchEntities = normalizedBranchIds.Length == 0
            ? []
            : await _dbContext.Branches
                .AsNoTracking()
                .Where(x => normalizedBranchIds.Contains(x.Id) && x.InstitutionId == institutionId && !x.IsDeleted)
                .ToListAsync(cancellationToken);

        if (branchEntities.Count != normalizedBranchIds.Length)
        {
            throw new InvalidOperationException("One or more selected branches are invalid.");
        }

        var libraryEntities = normalizedLibraryIds.Length == 0
            ? []
            : await _dbContext.Libraries
                .AsNoTracking()
                .Where(x => normalizedLibraryIds.Contains(x.Id) && x.InstitutionId == institutionId && !x.IsDeleted)
                .ToListAsync(cancellationToken);

        if (libraryEntities.Count != normalizedLibraryIds.Length)
        {
            throw new InvalidOperationException("One or more selected libraries are invalid.");
        }

        foreach (var library in libraryEntities)
        {
            if (normalizedBranchIds.Length > 0 && !normalizedBranchIds.Contains(library.BranchId))
            {
                throw new InvalidOperationException("Selected libraries must belong to selected branches.");
            }
        }

        _dbContext.UserInstitutions.Add(new UserInstitution
        {
            UserId = targetUserId,
            InstitutionId = institution.Id,
            IsPrimary = isPrimaryInstitution,
            IsActive = true,
            AssignedAtUtc = DateTime.UtcNow
        });

        foreach (var branch in branchEntities)
        {
            _dbContext.UserBranches.Add(new UserBranch
            {
                UserId = targetUserId,
                InstitutionId = institution.Id,
                BranchId = branch.Id,
                IsPrimary = branchEntities.Count == 1,
                IsActive = true,
                AssignedAtUtc = DateTime.UtcNow
            });
        }

        foreach (var library in libraryEntities)
        {
            _dbContext.UserLibraries.Add(new UserLibrary
            {
                UserId = targetUserId,
                InstitutionId = institution.Id,
                BranchId = library.BranchId,
                LibraryId = library.Id,
                IsPrimary = libraryEntities.Count == 1,
                IsActive = true,
                AssignedAtUtc = DateTime.UtcNow
            });
        }
    }

    private async Task RemoveUserAccessScopeAsync(string userId, CancellationToken cancellationToken)
    {
        var institutions = await _dbContext.UserInstitutions.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var branches = await _dbContext.UserBranches.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var libraries = await _dbContext.UserLibraries.Where(x => x.UserId == userId).ToListAsync(cancellationToken);

        if (institutions.Count > 0) _dbContext.UserInstitutions.RemoveRange(institutions);
        if (branches.Count > 0) _dbContext.UserBranches.RemoveRange(branches);
        if (libraries.Count > 0) _dbContext.UserLibraries.RemoveRange(libraries);

        if (institutions.Count > 0 || branches.Count > 0 || libraries.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task EnsureCallerCanAssignScopeAsync(string callerUserId, Guid institutionId, CancellationToken cancellationToken)
    {
        if (await IsSuperAdminAsync(callerUserId, cancellationToken))
        {
            return;
        }

        var hasAccess = await _dbContext.UserInstitutions.AsNoTracking().AnyAsync(
                ui => ui.UserId == callerUserId && ui.IsActive && ui.InstitutionId == institutionId,
                cancellationToken)
            || await _dbContext.UserBranches.AsNoTracking().AnyAsync(
                ub => ub.UserId == callerUserId && ub.IsActive && ub.InstitutionId == institutionId,
                cancellationToken)
            || await _dbContext.UserLibraries.AsNoTracking().AnyAsync(
                ul => ul.UserId == callerUserId && ul.IsActive && ul.InstitutionId == institutionId,
                cancellationToken);

        if (!hasAccess)
        {
            throw new InvalidOperationException("You do not have access to assign users to this institution.");
        }
    }

    private async Task<List<InstitutionDropdownResponse>> BuildScopedInstitutionDropdownAsync(
        string callerUserId,
        CancellationToken cancellationToken)
    {
        var institutions = await _dbContext.UserInstitutions
            .AsNoTracking()
            .Where(x => x.UserId == callerUserId && x.IsActive)
            .Include(x => x.Institution)
            .ToListAsync(cancellationToken);

        var branches = await _dbContext.UserBranches
            .AsNoTracking()
            .Where(x => x.UserId == callerUserId && x.IsActive)
            .Include(x => x.Branch)
            .ToListAsync(cancellationToken);

        var libraries = await _dbContext.UserLibraries
            .AsNoTracking()
            .Where(x => x.UserId == callerUserId && x.IsActive)
            .Include(x => x.Library)
            .ToListAsync(cancellationToken);

        return BuildInstitutionDropdown(institutions, branches, libraries);
    }

    private async Task<List<InstitutionDropdownResponse>> BuildFullInstitutionDropdownAsync(CancellationToken cancellationToken)
    {
        var institutionEntities = await _dbContext.Institutions
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var branchEntities = await _dbContext.Branches
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .ToListAsync(cancellationToken);

        var libraryEntities = await _dbContext.Libraries
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .ToListAsync(cancellationToken);

        return institutionEntities.Select(inst => new InstitutionDropdownResponse
        {
            Value = inst.Id,
            Key = inst.Name,
            Branches = branchEntities
                .Where(b => b.InstitutionId == inst.Id)
                .OrderBy(b => b.Name)
                .Select(b => new BranchDropdownResponse
                {
                    Value = b.Id,
                    Key = b.Name,
                    Libraries = libraryEntities
                        .Where(l => l.BranchId == b.Id)
                        .OrderBy(l => l.Name)
                        .Select(l => new LibraryDropdownResponse
                        {
                            Value = l.Id,
                            Key = l.Name,
                            Plans = []
                        })
                        .ToList()
                })
                .ToList()
        }).ToList();
    }

    private static List<InstitutionDropdownResponse> BuildInstitutionDropdown(
        IReadOnlyCollection<UserInstitution> institutions,
        IReadOnlyCollection<UserBranch> branches,
        IReadOnlyCollection<UserLibrary> libraries)
    {
        return institutions
            .GroupBy(x => x.InstitutionId)
            .Select(group =>
            {
                var institution = group.First().Institution;
                return new InstitutionDropdownResponse
                {
                    Value = group.Key,
                    Key = institution?.Name ?? "Institution",
                    Branches = branches
                        .Where(b => b.InstitutionId == group.Key)
                        .GroupBy(b => b.BranchId)
                        .Select(branchGroup =>
                        {
                            var branch = branchGroup.First().Branch;
                            return new BranchDropdownResponse
                            {
                                Value = branchGroup.Key,
                                Key = branch?.Name ?? "Branch",
                                Libraries = libraries
                                    .Where(l => l.BranchId == branchGroup.Key)
                                    .GroupBy(l => l.LibraryId)
                                    .Select(libraryGroup =>
                                    {
                                        var library = libraryGroup.First().Library;
                                        return new LibraryDropdownResponse
                                        {
                                            Value = libraryGroup.Key,
                                            Key = library?.Name ?? "Library",
                                            Plans = []
                                        };
                                    })
                                    .OrderBy(l => l.Key)
                                    .ToList()
                            };
                        })
                        .OrderBy(b => b.Key)
                        .ToList()
                };
            })
            .OrderBy(i => i.Key)
            .ToList();
    }
}

