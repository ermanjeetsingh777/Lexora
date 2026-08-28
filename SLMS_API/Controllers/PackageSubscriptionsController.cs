using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Contracts.PackageSubscription;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/package-subscriptions")]
[Authorize]
public class PackageSubscriptionsController : ControllerBase
{
    private readonly IPackageSubscriptionService _packageSubscriptionService;
    private readonly ICurrentUserService _currentUserService;

    public PackageSubscriptionsController(
        IPackageSubscriptionService packageSubscriptionService,
        ICurrentUserService currentUserService)
    {
        _packageSubscriptionService = packageSubscriptionService;
        _currentUserService = currentUserService;
    }

    [HttpGet("overview")]
    [Permission(PermissionKey.SubscriptionsView)]
    public async Task<ActionResult<ApiResponse<PackageSubscriptionOverviewResponse>>> GetOverview(
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var overview = await _packageSubscriptionService.GetOverviewAsync(userId, cancellationToken);
        return Ok(ApiResponse<PackageSubscriptionOverviewResponse>.Ok(overview));
    }

    [HttpGet("quote")]
    [Permission(PermissionKey.SubscriptionsView)]
    public async Task<ActionResult<ApiResponse<PackageSubscriptionQuoteResponse>>> GetQuote(
        [FromQuery] Guid subscriptionId,
        [FromQuery] Guid packageId,
        [FromQuery] bool forUpgrade = false,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var quote = await _packageSubscriptionService.GetQuoteAsync(
            userId,
            subscriptionId,
            packageId,
            forUpgrade,
            cancellationToken);
        return Ok(ApiResponse<PackageSubscriptionQuoteResponse>.Ok(quote));
    }

    [HttpPost("renew")]
    [Permission(PermissionKey.SubscriptionsUpdate)]
    public async Task<ActionResult<ApiResponse<PackageSubscriptionItemResponse>>> Renew(
        [FromBody] RenewPackageSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var renewed = await _packageSubscriptionService.RenewAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<PackageSubscriptionItemResponse>.Ok(renewed, "Subscription renewed successfully."));
    }

    [HttpPut("{subscriptionId:guid}")]
    [Permission(PermissionKey.SubscriptionsUpdate)]
    public async Task<ActionResult<ApiResponse<PackageSubscriptionItemResponse>>> Update(
        Guid subscriptionId,
        [FromBody] UpdatePackageSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var updated = await _packageSubscriptionService.UpdateAsync(userId, subscriptionId, request, cancellationToken);
        return Ok(ApiResponse<PackageSubscriptionItemResponse>.Ok(updated, "Subscription updated successfully."));
    }

    [HttpPost("subscribe")]
    [Permission(PermissionKey.SubscriptionsCreate)]
    public async Task<ActionResult<ApiResponse<UserPackageResponse>>> Subscribe(
        [FromBody] SubscribePackageRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var subscribed = await _packageSubscriptionService.SubscribeAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<UserPackageResponse>.Ok(subscribed, "Subscription created successfully."));
    }

    [HttpPost("upgrade")]
    [Permission(PermissionKey.SubscriptionsUpdate)]
    public async Task<ActionResult<ApiResponse<UserPackageResponse>>> Upgrade(
        [FromBody] UpgradePackageRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var upgraded = await _packageSubscriptionService.UpgradeAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<UserPackageResponse>.Ok(upgraded, "Subscription upgraded successfully."));
    }
}
