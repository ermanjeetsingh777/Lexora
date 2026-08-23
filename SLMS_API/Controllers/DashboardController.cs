using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Dashboard;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ICurrentUserService _currentUserService;

    public DashboardController(IDashboardService dashboardService, ICurrentUserService currentUserService)
    {
        _dashboardService = dashboardService;
        _currentUserService = currentUserService;
    }

    [HttpGet("overview")]
    [Permission(PermissionKey.DashboardView)]
    public async Task<ActionResult<ApiResponse<DashboardOverviewResponse>>> GetOverview(
        [FromQuery] DashboardQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var overview = await _dashboardService.GetOverviewAsync(query, userId, cancellationToken);
        return Ok(ApiResponse<DashboardOverviewResponse>.Ok(overview));
    }

    [HttpGet("revenue")]
    [Permission(PermissionKey.DashboardView)]
    public async Task<ActionResult<ApiResponse<DashboardRevenueResponse>>> GetRevenue(
        [FromQuery] DashboardQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var revenue = await _dashboardService.GetRevenueAsync(query, userId, cancellationToken);
        return Ok(ApiResponse<DashboardRevenueResponse>.Ok(revenue));
    }

    [HttpGet("activity")]
    [Permission(PermissionKey.DashboardView)]
    public async Task<ActionResult<ApiResponse<DashboardActivityResponse>>> GetActivity(
        [FromQuery] DashboardActivityQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var activity = await _dashboardService.GetActivityAsync(query, userId, cancellationToken);
        return Ok(ApiResponse<DashboardActivityResponse>.Ok(activity));
    }
}
