using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog.Core;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Organizations;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Services;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly IMemberService _memberService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(
        IAttendanceService attendanceService,
        IMemberService memberService,
        ICurrentUserService currentUserService,
        ILogger<AttendanceController> logger)
    {
        _attendanceService = attendanceService;
        _memberService = memberService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Member Check-In
    /// </summary>
    [HttpPost("members/{memberId:guid}/check-in")]
    public async Task<ActionResult<ApiResponse<AttendanceResponse>>> CheckIn(Guid memberId, [FromBody] CheckInRequest request, CancellationToken cancellationToken)
    {
        var requiredClaim = PermissionKey.AttendanceCreate.ToClaimValue();
        var hasPermission = User.IsInRole(RoleDefinitions.SuperAdmin) ||
                            User.Claims.Any(x => x.Type == "permission" && string.Equals(x.Value, requiredClaim, StringComparison.OrdinalIgnoreCase));

        if (!hasPermission)
        {
            var currentMemberId = await _memberService.GetCurrentMemberIdAsync(cancellationToken);
            if (currentMemberId == null || currentMemberId.Value != memberId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AttendanceResponse>.Fail("You do not have permission to check in for this member."));
            }
        }

        try
        {
            var attendance = await _attendanceService.CheckInAsync(memberId, request, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<AttendanceResponse>.Ok(attendance, "Member checked in successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AttendanceResponse>.Fail(ex.Message));
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponse<AttendanceResponse>.Fail("An unexpected error occurred while checking in the member."));
        }
    }

    /// <summary>
    /// Member Check-Out
    /// </summary>
    [HttpPost("members/{memberId:guid}/check-out")]
    public async Task<ActionResult<ApiResponse<AttendanceResponse>>> CheckOut(Guid memberId, [FromBody] CheckOutRequest request, CancellationToken cancellationToken)
    {
        var requiredClaim = PermissionKey.AttendanceUpdate.ToClaimValue();
        var hasPermission = User.IsInRole(RoleDefinitions.SuperAdmin) ||
                            User.Claims.Any(x => x.Type == "permission" && string.Equals(x.Value, requiredClaim, StringComparison.OrdinalIgnoreCase));

        if (!hasPermission)
        {
            var currentMemberId = await _memberService.GetCurrentMemberIdAsync(cancellationToken);
            if (currentMemberId == null || currentMemberId.Value != memberId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AttendanceResponse>.Fail("You do not have permission to check out for this member."));
            }
        }

        try
        {
            var attendance = await _attendanceService.CheckOutAsync(memberId, request, _currentUserService.UserId ?? string.Empty, cancellationToken);

            return Ok(ApiResponse<AttendanceResponse>.Ok(attendance, "Member checked out successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Check-Out failed for member {MemberId}", memberId);

            return BadRequest(ApiResponse<AttendanceResponse>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,"Unexpected error while checking out member {MemberId}",memberId);

            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponse<AttendanceResponse>.Fail("An unexpected error occurred while checking out the member."));
        }
    }

    /// <summary>
    /// Get member monthly attendance calendar.
    /// </summary>
    [HttpGet("members/{memberId:guid}/calendar")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AttendanceResponse>>>> GetAttendanceCalendar(Guid memberId, [FromQuery] int month, [FromQuery] int year, CancellationToken cancellationToken)
    {
        try
        {
            if (month < 1 || month > 12)
            {
                return BadRequest(ApiResponse<IReadOnlyList<AttendanceResponse>>.Fail("Month must be between 1 and 12."));
            }

            if (year < 2000 || year > 2100)
            {
                return BadRequest(ApiResponse<IReadOnlyList<AttendanceResponse>>.Fail("Invalid year."));
            }

            var attendance = await _attendanceService.GetAttendanceCalendarAsync(memberId,month,year,cancellationToken);

            return Ok(ApiResponse<IReadOnlyList<AttendanceResponse>>.Ok(attendance, "Monthly attendance retrieved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex,"Failed to get monthly attendance for Member {MemberId}", memberId);

            return BadRequest(ApiResponse<IReadOnlyList<AttendanceResponse>>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,"Unexpected error while getting monthly attendance for Member {MemberId}",memberId);

            return StatusCode(StatusCodes.Status500InternalServerError,ApiResponse<IReadOnlyList<AttendanceResponse>>.Fail("An unexpected error occurred while retrieving monthly attendance."));
        }
    }

    /// <summary>
    /// Get member attendance records for a date range (report/export).
    /// </summary>
    [HttpGet("members/{memberId:guid}/records")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AttendanceResponse>>>> GetMemberRecords(
        Guid memberId,
        [FromQuery] DateOnly dateFrom,
        [FromQuery] DateOnly dateTo,
        CancellationToken cancellationToken)
    {
        try
        {
            var records = await _attendanceService.GetMemberRecordsAsync(memberId, dateFrom, dateTo, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<AttendanceResponse>>.Ok(records, "Member attendance records retrieved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyList<AttendanceResponse>>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while getting attendance records for Member {MemberId}", memberId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<IReadOnlyList<AttendanceResponse>>.Fail("An unexpected error occurred while retrieving attendance records."));
        }
    }

    /// <summary>
    /// Get member attendance statistics for the last 90 days.
    /// </summary>
    [HttpGet("members/{memberId:guid}/statistics")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<AttendanceStatisticsResponse>>> GetAttendanceStatistics(
        Guid memberId,
        CancellationToken cancellationToken)
    {
        try
        {
            var statistics = await _attendanceService.GetStatisticsAsync(memberId, cancellationToken);
            return Ok(ApiResponse<AttendanceStatisticsResponse>.Ok(statistics, "Attendance statistics retrieved successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to get attendance statistics for Member {MemberId}", memberId);
            return BadRequest(ApiResponse<AttendanceStatisticsResponse>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while getting attendance statistics for Member {MemberId}", memberId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<AttendanceStatisticsResponse>.Fail("An unexpected error occurred while retrieving attendance statistics."));
        }
    }

    /// <summary>
    /// Update an attendance record (check-in/out times, seat, remarks).
    /// </summary>
    [HttpPut("{attendanceId:guid}")]
    [Permission(PermissionKey.AttendanceUpdate)]
    public async Task<ActionResult<ApiResponse<AttendanceResponse>>> Update(
        Guid attendanceId,
        [FromBody] UpdateAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var attendance = await _attendanceService.UpdateAsync(
                attendanceId,
                request,
                _currentUserService.UserId ?? string.Empty,
                cancellationToken);
            return Ok(ApiResponse<AttendanceResponse>.Ok(attendance, "Attendance updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AttendanceResponse>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while updating attendance {AttendanceId}", attendanceId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<AttendanceResponse>.Fail("An unexpected error occurred while updating attendance."));
        }
    }

    /// <summary>
    /// Get seat availability for a library (blank / occupied).
    /// </summary>
    [HttpGet("libraries/{libraryId:guid}/seats")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>>> GetLibrarySeats(
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        try
        {
            var seats = await _attendanceService.GetLibrarySeatsAsync(libraryId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>.Ok(seats));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Library-scoped attendance summary for the logged-in user.
    /// </summary>
    [HttpGet("summary")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<AttendanceModuleSummaryResponse>>> GetModuleSummary(
        [FromQuery] AttendanceModuleQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var summary = await _attendanceService.GetModuleSummaryAsync(query, userId, cancellationToken);
            return Ok(ApiResponse<AttendanceModuleSummaryResponse>.Ok(summary));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AttendanceModuleSummaryResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AttendanceModuleSummaryResponse>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Library-scoped attendance records for the logged-in user.
    /// </summary>
    [HttpGet("records")]
    [Permission(PermissionKey.AttendanceList)]
    public async Task<ActionResult<ApiResponse<PagedResult<AttendanceRecordListItemResponse>>>> GetModuleRecords(
        [FromQuery] AttendanceModuleQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var records = await _attendanceService.GetModuleRecordsAsync(query, userId, cancellationToken);
            return Ok(ApiResponse<PagedResult<AttendanceRecordListItemResponse>>.Ok(records));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<PagedResult<AttendanceRecordListItemResponse>>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PagedResult<AttendanceRecordListItemResponse>>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Attendance analytics dashboard (trend, shift mix, hourly check-ins).
    /// </summary>
    [HttpGet("analytics")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<AttendanceAnalyticsResponse>>> GetModuleAnalytics(
        [FromQuery] AttendanceAnalyticsQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var analytics = await _attendanceService.GetModuleAnalyticsAsync(query, userId, cancellationToken);
            return Ok(ApiResponse<AttendanceAnalyticsResponse>.Ok(analytics));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AttendanceAnalyticsResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AttendanceAnalyticsResponse>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Live check-in / check-out feed for today.
    /// </summary>
    [HttpGet("live")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AttendanceLiveEventResponse>>>> GetLiveFeed(
        [FromQuery] Guid? libraryId,
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var feed = await _attendanceService.GetLiveFeedAsync(libraryId, limit, userId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<AttendanceLiveEventResponse>>.Ok(feed));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<IReadOnlyList<AttendanceLiveEventResponse>>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Monthly attendance heatmap for library-scoped calendar view.
    /// </summary>
    [HttpGet("calendar/month")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<AttendanceCalendarMonthResponse>>> GetModuleCalendarMonth(
        [FromQuery] AttendanceCalendarMonthQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var month = await _attendanceService.GetModuleCalendarMonthAsync(query, userId, cancellationToken);
            return Ok(ApiResponse<AttendanceCalendarMonthResponse>.Ok(month));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AttendanceCalendarMonthResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AttendanceCalendarMonthResponse>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Aggregated attendance summary for a selected day or date range.
    /// </summary>
    [HttpGet("calendar/summary")]
    [Permission(PermissionKey.AttendanceView)]
    public async Task<ActionResult<ApiResponse<AttendanceCalendarSummaryResponse>>> GetModuleCalendarSummary(
        [FromQuery] AttendanceCalendarSummaryQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var summary = await _attendanceService.GetModuleCalendarSummaryAsync(query, userId, cancellationToken);
            return Ok(ApiResponse<AttendanceCalendarSummaryResponse>.Ok(summary));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AttendanceCalendarSummaryResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AttendanceCalendarSummaryResponse>.Fail(ex.Message));
        }
    }
}
