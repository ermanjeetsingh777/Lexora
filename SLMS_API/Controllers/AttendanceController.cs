using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog.Core;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Services;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(IAttendanceService attendanceService, ICurrentUserService currentUserService, ILogger<AttendanceController> logger)
    {
        _attendanceService = attendanceService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Member Check-In
    /// </summary>
    [HttpPost("members/{memberId:guid}/check-in")]
    //[Permission(PermissionKey.AttendanceManage)]
    public async Task<ActionResult<ApiResponse<AttendanceResponse>>> CheckIn(Guid memberId, [FromBody] CheckInRequest request, CancellationToken cancellationToken)
    {
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
    //[Permission(PermissionKey.AttendanceManage)]
    public async Task<ActionResult<ApiResponse<AttendanceResponse>>> CheckOut(Guid memberId, [FromBody] CheckOutRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var attendance = await _attendanceService.CheckOutAsync(memberId, request, _currentUserService.UserId, cancellationToken);

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
    //[Permission(PermissionKey.AttendanceView)]
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
    /// Get member attendance statistics for the last 90 days.
    /// </summary>
    [HttpGet("members/{memberId:guid}/statistics")]
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
}
