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
[Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/seats")]
[Authorize]
public class SeatsController : ControllerBase
{
    private readonly ISeatService _seatService;
    private readonly ICurrentUserService _currentUserService;

    public SeatsController(ISeatService seatService, ICurrentUserService currentUserService)
    {
        _seatService = seatService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Permission(PermissionKey.SeatsView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<SeatResponse>>>> GetAll(Guid institutionId, Guid branchId, CancellationToken cancellationToken)
    {
        var items = await _seatService.GetByBranchAsync(institutionId, branchId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<SeatResponse>>.Ok(items));
    }

    [HttpPost]
    [Permission(PermissionKey.SeatsUpdate)]
    public async Task<ActionResult<ApiResponse<SeatResponse>>> Create(Guid institutionId, Guid branchId, [FromBody] CreateSeatRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        var item = await _seatService.CreateAsync(institutionId, branchId, request, userId, cancellationToken);
        return Ok(ApiResponse<SeatResponse>.Ok(item, "Seat created successfully."));
    }

    [HttpGet("{seatId:guid}")]
    [Permission(PermissionKey.SeatsView)]
    public async Task<ActionResult<ApiResponse<SeatResponse>>> GetById(Guid institutionId, Guid branchId, Guid seatId, CancellationToken cancellationToken)
    {
        var item = await _seatService.GetByIdAsync(institutionId, branchId, seatId, cancellationToken);
        if (item is null) return NotFound(ApiResponse<SeatResponse>.Fail("Seat not found."));
        return Ok(ApiResponse<SeatResponse>.Ok(item));
    }

    [HttpPut("{seatId:guid}")]
    [Permission(PermissionKey.SeatsUpdate)]
    public async Task<ActionResult<ApiResponse<SeatResponse>>> Update(Guid institutionId, Guid branchId, Guid seatId, [FromBody] UpdateSeatRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        var item = await _seatService.UpdateAsync(institutionId, branchId, seatId, request, userId, cancellationToken);
        return Ok(ApiResponse<SeatResponse>.Ok(item, "Seat updated successfully."));
    }

    [HttpDelete("{seatId:guid}")]
    [Permission(PermissionKey.SeatsUpdate)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid institutionId, Guid branchId, Guid seatId, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        await _seatService.DeleteAsync(institutionId, branchId, seatId, userId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { message = "Seat deleted successfully." }));
    }
}
