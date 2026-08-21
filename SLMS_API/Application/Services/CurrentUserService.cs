using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Application.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPermissionResolver _permissionResolver;

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor,
        UserManager<ApplicationUser> userManager,
        IPermissionResolver permissionResolver)
    {
        _httpContextAccessor = httpContextAccessor;
        _userManager = userManager;
        _permissionResolver = permissionResolver;
    }

    public string? UserId => ResolveUserId(_httpContextAccessor.HttpContext?.User);

    private static string? ResolveUserId(ClaimsPrincipal? user)
    {
        if (user is null)
        {
            return null;
        }

        return user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue("sub");
    }
    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public string? IpAddress => _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public async Task<CurrentUserResponse?> GetCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(UserId))
        {
            return null;
        }

        var user = await _userManager.FindByIdAsync(UserId);
        if (user is null)
        {
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);
        var principal = _httpContextAccessor.HttpContext?.User;
        var permissions = principal is not null && principal.GetPermissions().Count > 0
            ? principal.GetPermissions()
            : await _permissionResolver.GetPermissionsForRolesAsync(roles, cancellationToken);

        return new CurrentUserResponse
        {
            Id = user.Id,
            Email = user.Email,
            UserName = user.UserName,
            FullName = user.FullName,
            IsActive = user.IsActive,
            OnboardingStep = user.OnboardingStep,
            TwoFactorEnabled = user.TwoFactorEnabled,
            Roles = roles.ToArray(),
            Permissions = permissions
        };
    }
}
