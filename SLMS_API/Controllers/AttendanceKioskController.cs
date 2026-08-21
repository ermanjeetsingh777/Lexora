using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

/// <summary>
/// Public attendance kiosk — no login. Secured by library or member QR tokens.
/// </summary>
[ApiController]
[Route("api/v1/attendance/kiosk")]
[AllowAnonymous]
public class AttendanceKioskController : ControllerBase
{
    private readonly IAttendanceScannerService _scannerService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AttendanceKioskController> _logger;

    public AttendanceKioskController(
        IAttendanceScannerService scannerService,
        IConfiguration configuration,
        ILogger<AttendanceKioskController> logger)
    {
        _scannerService = scannerService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("library/context")]
    public async Task<ActionResult<ApiResponse<ScannerContextResponse>>> GetLibraryContext(
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        try
        {
            var context = await _scannerService.GetContextAsync(token, GetLibraryKioskUrlBase(), cancellationToken);
            return Ok(ApiResponse<ScannerContextResponse>.Ok(context));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ScannerContextResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("library/members")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ScannerMemberOption>>>> SearchMembers(
        [FromQuery] string token,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        try
        {
            var members = await _scannerService.SearchMembersAsync(token, search, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<ScannerMemberOption>>.Ok(members));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyList<ScannerMemberOption>>.Fail(ex.Message));
        }
    }

    [HttpGet("library/members/{memberId:guid}/status")]
    public async Task<ActionResult<ApiResponse<ScannerMemberStatusResponse>>> GetMemberStatus(
        [FromQuery] string token,
        Guid memberId,
        CancellationToken cancellationToken)
    {
        try
        {
            var status = await _scannerService.GetMemberStatusAsync(token, memberId, cancellationToken);
            return Ok(ApiResponse<ScannerMemberStatusResponse>.Ok(status));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ScannerMemberStatusResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("library/seats")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>>> GetLibrarySeats(
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        try
        {
            var seats = await _scannerService.GetLibrarySeatsAsync(token, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>.Ok(seats));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>.Fail(ex.Message));
        }
    }

    [HttpPost("library/record")]
    public async Task<ActionResult<ApiResponse<ScannerAttendanceResultResponse>>> RecordLibrary(
        [FromBody] ScannerAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.Equals(request.Action, "done", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<ScannerAttendanceResultResponse>.Fail("Member has already completed attendance for today."));
            }

            var result = await _scannerService.RecordAsync(request, "kiosk", cancellationToken);
            return Ok(ApiResponse<ScannerAttendanceResultResponse>.Ok(result, result.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Kiosk library record failed for member {MemberId}", request.MemberId);
            return BadRequest(ApiResponse<ScannerAttendanceResultResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("member/context")]
    public async Task<ActionResult<ApiResponse<MemberScannerContextResponse>>> GetMemberContext(
        [FromQuery] string token,
        [FromQuery] string? deviceId,
        CancellationToken cancellationToken)
    {
        try
        {
            var context = await _scannerService.GetMemberContextAsync(
                token,
                GetMemberKioskUrlBase(),
                deviceId,
                cancellationToken);
            return Ok(ApiResponse<MemberScannerContextResponse>.Ok(context));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<MemberScannerContextResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("member/status")]
    public async Task<ActionResult<ApiResponse<ScannerMemberStatusResponse>>> GetMemberSelfStatus(
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        try
        {
            var status = await _scannerService.GetMemberStatusByTokenAsync(token, cancellationToken);
            return Ok(ApiResponse<ScannerMemberStatusResponse>.Ok(status));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ScannerMemberStatusResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("member/seats")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>>> GetMemberSeats(
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        try
        {
            var context = await _scannerService.GetMemberContextAsync(
                token,
                GetMemberKioskUrlBase(),
                deviceId: null,
                cancellationToken);
            var seats = await _scannerService.GetLibrarySeatsByLibraryIdAsync(context.LibraryId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>.Ok(seats));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyList<AttendanceSeatOptionResponse>>.Fail(ex.Message));
        }
    }

    [HttpPost("member/record")]
    public async Task<ActionResult<ApiResponse<ScannerAttendanceResultResponse>>> RecordMember(
        [FromBody] MemberScannerRecordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.Equals(request.Action, "done", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<ScannerAttendanceResultResponse>.Fail("Attendance already completed for today."));
            }

            var result = await _scannerService.RecordByMemberTokenAsync(request, "kiosk", cancellationToken);
            return Ok(ApiResponse<ScannerAttendanceResultResponse>.Ok(result, result.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Kiosk member record failed");
            return BadRequest(ApiResponse<ScannerAttendanceResultResponse>.Fail(ex.Message));
        }
    }

    private string? GetLibraryKioskUrlBase() =>
        _configuration["Attendance:LibraryKioskUrlBase"]
        ?? _configuration["Attendance:ScannerUrlBase"];

    private string? GetMemberKioskUrlBase() =>
        _configuration["Attendance:MemberKioskUrlBase"];
}
