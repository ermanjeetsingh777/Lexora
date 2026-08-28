using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/branches")]
[Authorize]
public class BranchListController : ControllerBase
{
    private readonly IBranchService _branchService;
    private readonly ICurrentUserService _currentUserService;

    public BranchListController(IBranchService branchService, ICurrentUserService currentUserService)
    {
        _branchService = branchService;
        _currentUserService = currentUserService;
    }

    [HttpGet("list")]
    [Permission(PermissionKey.BranchesList)]
    public async Task<ActionResult<ApiResponse<BranchListViewResponse>>> GetListView(
        [FromQuery] BranchListQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _branchService.GetListViewAsync(query, userId, cancellationToken);
        return Ok(ApiResponse<BranchListViewResponse>.Ok(view));
    }

    [HttpGet("{branchId:guid}")]
    [Permission(PermissionKey.BranchesView)]
    public async Task<ActionResult<ApiResponse<BranchDetailViewResponse>>> GetDetailView(
        Guid branchId,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _branchService.GetDetailViewAsync(branchId, userId, cancellationToken);
        if (view is null)
        {
            return NotFound(ApiResponse<BranchDetailViewResponse>.Fail("Branch not found."));
        }

        return Ok(ApiResponse<BranchDetailViewResponse>.Ok(view));
    }
}
