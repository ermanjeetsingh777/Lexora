using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Admin.Responses;
using SLMS_API.Application.Contracts.Auth.Requests;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class ProfileService : IProfileService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionResolver _permissionResolver;
    private readonly IAdminService _adminService;
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public ProfileService(
        UserManager<ApplicationUser> userManager,
        IPermissionResolver permissionResolver,
        IAdminService adminService,
        ApplicationDbContext dbContext,
        IAuditLogService auditLogService)
    {
        _userManager = userManager;
        _permissionResolver = permissionResolver;
        _adminService = adminService;
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<UserProfileResponse?> GetProfileAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);
        var permissions = await _permissionResolver.GetPermissionsForRolesAsync(roles, cancellationToken);
        var accessScope = await _adminService.GetUserAccessScopeAsync(userId, cancellationToken);
        var permissionDetails = await LoadPermissionDetailsAsync(permissions, cancellationToken);

        return MapProfile(user, roles, permissions, permissionDetails, accessScope);
    }

    public async Task<UserProfileResponse> UpdateProfileAsync(string userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            user.FullName = request.FullName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.UserName) && !string.Equals(user.UserName, request.UserName.Trim(), StringComparison.Ordinal))
        {
            var userName = request.UserName.Trim();
            var existing = await _userManager.FindByNameAsync(userName);
            if (existing is not null && !string.Equals(existing.Id, user.Id, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Username is already taken.");
            }

            var userNameResult = await _userManager.SetUserNameAsync(user, userName);
            if (!userNameResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join("; ", userNameResult.Errors.Select(e => e.Description)));
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !string.Equals(user.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var email = request.Email.Trim();
            var existing = await _userManager.FindByEmailAsync(email);
            if (existing is not null && !string.Equals(existing.Id, user.Id, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Email is already in use.");
            }

            var emailResult = await _userManager.SetEmailAsync(user, email);
            if (!emailResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join("; ", emailResult.Errors.Select(e => e.Description)));
            }
        }

        user.UpdatedAtUtc = DateTime.UtcNow;
        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", updateResult.Errors.Select(e => e.Description)));
        }

        return (await GetProfileAsync(userId, cancellationToken))!;
    }

    public async Task<MessageResponse> ChangePasswordAsync(
        string userId,
        ChangePasswordRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new InvalidOperationException("Current password is required.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new InvalidOperationException("New password is required.");
        }

        if (!string.Equals(request.NewPassword, request.ConfirmPassword, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("New password and confirmation do not match.");
        }

        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        var validCurrent = await _userManager.CheckPasswordAsync(user, request.CurrentPassword);
        if (!validCurrent)
        {
            throw new InvalidOperationException("Current password is incorrect.");
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        user.UpdatedAtUtc = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        await _auditLogService.WriteAsync(
            AuditEventTypes.PasswordReset,
            user.Id,
            "User changed password from profile",
            ipAddress,
            cancellationToken);

        return new MessageResponse { Message = "Password updated successfully." };
    }

    private async Task<IReadOnlyCollection<UserPermissionDetailResponse>> LoadPermissionDetailsAsync(
        IReadOnlyCollection<PermissionKey> permissions,
        CancellationToken cancellationToken)
    {
        if (permissions.Count == 0)
        {
            return [];
        }

        var ids = permissions.Select(p => (int)p).Distinct().ToList();
        var rows = await _dbContext.Permissions
            .AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .OrderBy(p => p.Code)
            .ToListAsync(cancellationToken);

        return rows
            .Select(p => new UserPermissionDetailResponse
            {
                Key = (PermissionKey)p.Id,
                Code = p.Code,
                Name = p.Name,
            })
            .ToList();
    }

    private static UserProfileResponse MapProfile(
        ApplicationUser user,
        IList<string> roles,
        IReadOnlyCollection<PermissionKey> permissions,
        IReadOnlyCollection<UserPermissionDetailResponse> permissionDetails,
        AdminUserAccessScopeResponse accessScope)
    {
        var isPlatformWide = string.Equals(accessScope.Summary, "Platform", StringComparison.OrdinalIgnoreCase)
            && accessScope.InstitutionScopes.Count == 0
            && accessScope.Branches.Count == 0
            && accessScope.Libraries.Count == 0;

        return new UserProfileResponse
        {
            Id = user.Id,
            Email = user.Email,
            UserName = user.UserName,
            FullName = user.FullName,
            IsActive = user.IsActive,
            TwoFactorEnabled = user.TwoFactorEnabled,
            UserType = user.UserType,
            OnboardingStep = user.OnboardingStep,
            CreatedAtUtc = user.CreatedAtUtc,
            UpdatedAtUtc = user.UpdatedAtUtc ?? user.CreatedAtUtc,
            Roles = roles.ToArray(),
            Permissions = permissions,
            PermissionDetails = permissionDetails,
            AccessScope = accessScope,
            AccessSummary = new UserAccessSummaryResponse
            {
                InstitutionCount = accessScope.InstitutionScopes.Count,
                BranchCount = accessScope.Branches.Count,
                LibraryCount = accessScope.Libraries.Count,
                IsPlatformWide = isPlatformWide,
            },
        };
    }
}
