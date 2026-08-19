using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/libraries")]
public class LibraryListController : ControllerBase
{
    private readonly ILibraryService _libraryService;
    private readonly ICurrentUserService _currentUserService;

    public LibraryListController(ILibraryService libraryService, ICurrentUserService currentUserService)
    {
        _libraryService = libraryService;
        _currentUserService = currentUserService;
    }

    [HttpGet("list")]
    public async Task<ActionResult<ApiResponse<LibraryListViewResponse>>> GetListView(
        [FromQuery] LibraryListQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _libraryService.GetListViewAsync(query, userId, cancellationToken);
        return Ok(ApiResponse<LibraryListViewResponse>.Ok(view));
    }

    [HttpGet("list/revenue")]
    public async Task<ActionResult<ApiResponse<LibraryListRevenueSummaryResponse>>> GetListRevenueSummary(
        [FromQuery] LibraryListQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var summary = await _libraryService.GetListRevenueSummaryAsync(query, userId, cancellationToken);
        return Ok(ApiResponse<LibraryListRevenueSummaryResponse>.Ok(summary));
    }
}
