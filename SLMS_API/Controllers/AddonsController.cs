using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Addon;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/addons")]
public class AddonsController : ControllerBase
{
    private readonly IAddonService _addonService;
    private readonly ICurrentUserService _currentUserService;

    public AddonsController(IAddonService addonService, ICurrentUserService currentUserService)
    {
        _addonService = addonService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AddonResponse>>>> GetActive(CancellationToken cancellationToken)
    {
        var addons = await _addonService.GetActiveAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<AddonResponse>>.Ok(addons));
    }

    [HttpGet("all")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<AddonResponse>>>> GetAll(CancellationToken cancellationToken)
    {
        var addons = await _addonService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<AddonResponse>>.Ok(addons));
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<AddonResponse>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var addon = await _addonService.GetByIdAsync(id, cancellationToken);
        if (addon == null)
            return NotFound(ApiResponse<AddonResponse>.Fail("Addon not found."));

        return Ok(ApiResponse<AddonResponse>.Ok(addon));
    }

    [HttpPost]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<AddonResponse>>> Create([FromBody] CreateAddonRequest request, CancellationToken cancellationToken)
    {
        var addon = await _addonService.CreateAsync(request, _currentUserService.UserId, cancellationToken);
        return Ok(ApiResponse<AddonResponse>.Ok(addon, "Addon created successfully."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<AddonResponse>>> Update(Guid id, [FromBody] UpdateAddonRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var addon = await _addonService.UpdateAsync(id, request, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<AddonResponse>.Ok(addon, "Addon updated successfully."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<AddonResponse>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await _addonService.DeleteAsync(id, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(new { message = "Addon deleted successfully." }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("purchase")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserAddonResponse>>> Purchase([FromBody] PurchaseAddonRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var userId = _currentUserService.UserId;
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(ApiResponse<UserAddonResponse>.Fail("User is not authenticated."));

            var userAddon = await _addonService.PurchaseAddonAsync(request, userId, cancellationToken);
            return Ok(ApiResponse<UserAddonResponse>.Ok(userAddon, "Add-on request submitted successfully. Awaiting SuperAdmin verification and approval."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<UserAddonResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("my-addons")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<UserAddonResponse>>>> GetMyAddons(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse<IReadOnlyCollection<UserAddonResponse>>.Fail("User is not authenticated."));

        var addons = await _addonService.GetUserAddonsAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<UserAddonResponse>>.Ok(addons));
    }

    [HttpGet("requests")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<UserAddonResponse>>>> GetAddonRequests([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var requests = await _addonService.GetAllAddonRequestsAsync(status, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<UserAddonResponse>>.Ok(requests));
    }

    [HttpPost("requests/{id:guid}/approve")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<UserAddonResponse>>> ApproveAddonRequest(
        Guid id,
        [FromBody] ApproveAddonRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var approverUserId = _currentUserService.UserId ?? "superadmin";
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var response = await _addonService.ApproveAddonRequestAsync(id, request, approverUserId, ipAddress, cancellationToken);
            return Ok(ApiResponse<UserAddonResponse>.Ok(response, "Add-on request approved and activated successfully. Quota expanded."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<UserAddonResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<UserAddonResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("requests/{id:guid}/reject")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<UserAddonResponse>>> RejectAddonRequest(
        Guid id,
        [FromBody] RejectAddonRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var approverUserId = _currentUserService.UserId ?? "superadmin";
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var response = await _addonService.RejectAddonRequestAsync(id, request, approverUserId, ipAddress, cancellationToken);
            return Ok(ApiResponse<UserAddonResponse>.Ok(response, "Add-on request rejected."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<UserAddonResponse>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<UserAddonResponse>.Fail(ex.Message));
        }
    }
}
