using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/libraries")]
[Authorize]
public class LibraryListController : ControllerBase
{
    private readonly ILibraryService _libraryService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAttendanceScannerService _scannerService;
    private readonly IConfiguration _configuration;

    public LibraryListController(
        ILibraryService libraryService,
        ICurrentUserService currentUserService,
        IAttendanceScannerService scannerService,
        IConfiguration configuration)
    {
        _libraryService = libraryService;
        _currentUserService = currentUserService;
        _scannerService = scannerService;
        _configuration = configuration;
    }

    [HttpGet("list")]
    [Permission(PermissionKey.LibrariesList)]
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
    [Permission(PermissionKey.LibrariesView)]
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

    [HttpGet("{libraryId:guid}")]
    [Permission(PermissionKey.LibrariesView)]
    public async Task<ActionResult<ApiResponse<LibraryDetailViewResponse>>> GetDetailView(
        Guid libraryId,
        [FromQuery] int trendDays = 30,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _libraryService.GetDetailViewAsync(libraryId, userId, trendDays, cancellationToken);
        if (view is null)
        {
            return NotFound(ApiResponse<LibraryDetailViewResponse>.Fail("Library not found."));
        }

        return Ok(ApiResponse<LibraryDetailViewResponse>.Ok(view));
    }

    [HttpGet("{libraryId:guid}/calendar")]
    public async Task<ActionResult<ApiResponse<LibraryCalendarViewResponse>>> GetCalendarView(
        Guid libraryId,
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        if (endDate < startDate)
        {
            return BadRequest(ApiResponse<LibraryCalendarViewResponse>.Fail("End date must be on or after start date."));
        }

        if (endDate.DayNumber - startDate.DayNumber > 366)
        {
            return BadRequest(ApiResponse<LibraryCalendarViewResponse>.Fail("Date range cannot exceed 366 days."));
        }

        var view = await _libraryService.GetCalendarViewAsync(libraryId, userId, startDate, endDate, cancellationToken);
        if (view is null)
        {
            return NotFound(ApiResponse<LibraryCalendarViewResponse>.Fail("Library not found."));
        }

        return Ok(ApiResponse<LibraryCalendarViewResponse>.Ok(view));
    }

    [HttpGet("{libraryId:guid}/attendance-qr")]
    [Permission(PermissionKey.LibrariesView)]
    public async Task<ActionResult<ApiResponse<ScannerQrCodeResponse>>> GetAttendanceQr(
        Guid libraryId,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            if (!await _libraryService.UserCanAccessLibraryAsync(libraryId, userId, cancellationToken))
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    ApiResponse<ScannerQrCodeResponse>.Fail("You do not have access to this library."));
            }

            var qr = await _scannerService.GetQrCodeAsync(
                libraryId,
                _configuration["Attendance:LibraryKioskUrlBase"]
                ?? _configuration["Attendance:ScannerUrlBase"],
                cancellationToken);
            return Ok(ApiResponse<ScannerQrCodeResponse>.Ok(qr));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ScannerQrCodeResponse>.Fail(ex.Message));
        }
    }
}
