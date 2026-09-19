using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SLMS_API.Application.Contracts.Common;

namespace SLMS_API.Infrastructure.Security;

/// <summary>
/// When JWT claim <c>must_change_password</c> is true, only password-change / logout / me endpoints are allowed.
/// </summary>
public sealed class MustChangePasswordMiddleware
{
    public const string ClaimType = "must_change_password";

    private static readonly PathString[] AllowedExact =
    [
        new("/api/v1/auth/change-password"),
        new("/api/v1/auth/logout"),
        new("/api/v1/auth/current-user"),
        new("/api/v1/auth/profile"),
        new("/api/v1/auth/refresh-token"),
        new("/api/v1/members/me"),
    ];

    private readonly RequestDelegate _next;

    public MustChangePasswordMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && context.User.HasClaim(ClaimType, "true")
            && !IsAllowed(context.Request))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(
                ApiResponse<object>.Fail("Password change required before continuing. Call POST /api/v1/auth/change-password."));
            return;
        }

        await _next(context);
    }

    private static bool IsAllowed(HttpRequest request)
    {
        var path = request.Path;

        foreach (var allowed in AllowedExact)
        {
            if (path.Equals(allowed, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        // Allow GET organization-entitlements / registration-status used by shell bootstrap.
        if (HttpMethods.IsGet(request.Method)
            && (path.Equals("/api/v1/auth/organization-entitlements", StringComparison.OrdinalIgnoreCase)
                || path.Equals("/api/v1/auth/registration-status", StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return false;
    }
}

public static class MustChangePasswordExtensions
{
    public static IApplicationBuilder UseMustChangePasswordGate(this IApplicationBuilder app) =>
        app.UseMiddleware<MustChangePasswordMiddleware>();
}
