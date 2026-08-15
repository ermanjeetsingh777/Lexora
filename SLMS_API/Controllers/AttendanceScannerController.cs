using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Attendance;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

/// <summary>
/// QR attendance scanner — one shared library token, member lookup, check-in/out.
/// </summary>
[ApiController]
[Route("api/v1/attendance/scanner")]
[Authorize]
public class AttendanceScannerController : ControllerBase
{
    private readonly IAttendanceScannerService _scannerService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AttendanceScannerController> _logger;

    public AttendanceScannerController(
        IAttendanceScannerService scannerService,
        ICurrentUserService currentUserService,
        IConfiguration configuration,
        ILogger<AttendanceScannerController> logger)
    {
        _scannerService = scannerService;
        _currentUserService = currentUserService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("context")]
    [Permission(PermissionKey.AttendanceScannerUse)]
    public async Task<ActionResult<ApiResponse<ScannerContextResponse>>> GetContext(
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        try
        {
            var context = await _scannerService.GetContextAsync(token, GetScanUrlBase(), cancellationToken);
            return Ok(ApiResponse<ScannerContextResponse>.Ok(context));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ScannerContextResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("members")]
    [Permission(PermissionKey.AttendanceScannerUse)]
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

    [HttpGet("members/{memberId:guid}/status")]
    [Permission(PermissionKey.AttendanceScannerUse)]
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

    [HttpPost("record")]
    [Permission(PermissionKey.AttendanceScannerUse)]
    public async Task<ActionResult<ApiResponse<ScannerAttendanceResultResponse>>> Record(
        [FromBody] ScannerAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.Equals(request.Action, "done", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<ScannerAttendanceResultResponse>.Fail("Member has already completed attendance for today."));
            }

            var result = await _scannerService.RecordAsync(request, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<ScannerAttendanceResultResponse>.Ok(result, result.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Scanner record failed for member {MemberId}", request.MemberId);
            return BadRequest(ApiResponse<ScannerAttendanceResultResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("libraries/{libraryId:guid}/qr")]
    [Permission(PermissionKey.AttendanceScannerUse)]
    public async Task<ActionResult<ApiResponse<ScannerQrCodeResponse>>> GetLibraryQr(
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        try
        {
            var qr = await _scannerService.GetQrCodeAsync(libraryId, GetScanUrlBase(), cancellationToken);
            return Ok(ApiResponse<ScannerQrCodeResponse>.Ok(qr));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ScannerQrCodeResponse>.Fail(ex.Message));
        }
    }

    private string? GetScanUrlBase() =>
        _configuration["Attendance:ScannerUrlBase"];
}
