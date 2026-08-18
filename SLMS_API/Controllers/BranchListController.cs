using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/branches")]
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
}
