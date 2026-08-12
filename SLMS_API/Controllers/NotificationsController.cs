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
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUserService;

    public NotificationsController(INotificationService notificationService, ICurrentUserService currentUserService)
    {
        _notificationService = notificationService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<NotificationResponse>>>> GetForUser(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        var items = await _notificationService.GetForUserAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<NotificationResponse>>.Ok(items));
    }

    [HttpPost]
    [Permission(PermissionKey.NotificationsManage)]
    public async Task<ActionResult<ApiResponse<NotificationResponse>>> Create([FromBody] NotificationRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        var item = await _notificationService.CreateAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<NotificationResponse>.Ok(item, "Notification created."));
    }

    [HttpPut("{notificationId:guid}/mark-as-read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkAsRead(Guid notificationId, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        await _notificationService.MarkAsReadAsync(userId, notificationId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { message = "Marked as read." }));
    }
}
