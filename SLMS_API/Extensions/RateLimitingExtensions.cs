using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Options;

namespace SLMS_API.Extensions;

internal static class RateLimitingExtensions
{
    public const string Auth = "auth";
    public const string Otp = "otp";
    public const string Kiosk = "kiosk";
    public const string MemberQr = "member_qr";

    internal static IServiceCollection AddSlmsRateLimiting(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<RateLimitingOptions>(configuration.GetSection(RateLimitingOptions.SectionName));

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, cancellationToken) =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetService<ILoggerFactory>()
                    ?.CreateLogger("SLMS.RateLimiting");

                var ip = GetClientKey(context.HttpContext);
                var path = context.HttpContext.Request.Path.Value;
                logger?.LogWarning(
                    "Rate limit exceeded for {Ip} on {Method} {Path}",
                    ip,
                    context.HttpContext.Request.Method,
                    path);

                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString();
                }

                context.HttpContext.Response.ContentType = "application/json";
                var payload = ApiResponse<object>.Fail(
                    "Too many requests. Please wait a moment and try again.");
                await context.HttpContext.Response.WriteAsJsonAsync(payload, cancellationToken);
            };

            options.AddPolicy(Auth, httpContext =>
                CreatePartition(httpContext, Auth, o => o.Auth));

            options.AddPolicy(Otp, httpContext =>
                CreatePartition(httpContext, Otp, o => o.Otp));

            options.AddPolicy(Kiosk, httpContext =>
                CreatePartition(httpContext, Kiosk, o => o.Kiosk));

            options.AddPolicy(MemberQr, httpContext =>
                CreatePartition(httpContext, MemberQr, o => o.MemberQr));
        });

        return services;
    }

    internal static IApplicationBuilder UseSlmsRateLimiting(this IApplicationBuilder app) =>
        app.UseRateLimiter();

    private static RateLimitPartition<string> CreatePartition(
        HttpContext httpContext,
        string policyName,
        Func<RateLimitingOptions, RateLimitingOptions.PolicyOptions> select)
    {
        var opts = httpContext.RequestServices
            .GetRequiredService<IOptions<RateLimitingOptions>>()
            .Value;

        if (!opts.Enabled)
        {
            return RateLimitPartition.GetNoLimiter($"disabled:{policyName}");
        }

        var policy = select(opts);
        var permit = Math.Max(1, policy.PermitLimit);
        var window = TimeSpan.FromSeconds(Math.Max(1, policy.WindowSeconds));
        var key = $"{policyName}:{GetClientKey(httpContext)}";

        return RateLimitPartition.GetSlidingWindowLimiter(
            key,
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = permit,
                Window = window,
                SegmentsPerWindow = 6,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            });
    }

    private static string GetClientKey(HttpContext httpContext)
    {
        var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(first))
            {
                return first;
            }
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
