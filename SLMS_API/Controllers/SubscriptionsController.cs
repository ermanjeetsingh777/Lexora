using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions/{institutionId:guid}/subscriptions")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly ICurrentUserService _currentUserService;

    public SubscriptionsController(ISubscriptionService subscriptionService, ICurrentUserService currentUserService)
    {
        _subscriptionService = subscriptionService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Permission(PermissionKey.SubscriptionsView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<SubscriptionResponse>>>> GetAll(Guid institutionId, CancellationToken cancellationToken)
    {
        var items = await _subscriptionService.GetByInstitutionAsync(institutionId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<SubscriptionResponse>>.Ok(items));
    }

    [HttpPost]
    [Permission(PermissionKey.SubscriptionsManage)]
    public async Task<ActionResult<ApiResponse<SubscriptionResponse>>> Create(Guid institutionId, [FromBody] CreateSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        var item = await _subscriptionService.CreateAsync(institutionId, request, userId, cancellationToken);
        return Ok(ApiResponse<SubscriptionResponse>.Ok(item, "Subscription created successfully."));
    }

    [HttpGet("{subscriptionId:guid}")]
    [Permission(PermissionKey.SubscriptionsView)]
    public async Task<ActionResult<ApiResponse<SubscriptionResponse>>> GetById(Guid institutionId, Guid subscriptionId, CancellationToken cancellationToken)
    {
        var item = await _subscriptionService.GetByIdAsync(institutionId, subscriptionId, cancellationToken);
        if (item is null) return NotFound(ApiResponse<SubscriptionResponse>.Fail("Subscription not found."));
        return Ok(ApiResponse<SubscriptionResponse>.Ok(item));
    }

    [HttpPut("{subscriptionId:guid}")]
    [Permission(PermissionKey.SubscriptionsManage)]
    public async Task<ActionResult<ApiResponse<SubscriptionResponse>>> Update(Guid institutionId, Guid subscriptionId, [FromBody] UpdateSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        var item = await _subscriptionService.UpdateAsync(institutionId, subscriptionId, request, userId, cancellationToken);
        return Ok(ApiResponse<SubscriptionResponse>.Ok(item, "Subscription updated successfully."));
    }
}
