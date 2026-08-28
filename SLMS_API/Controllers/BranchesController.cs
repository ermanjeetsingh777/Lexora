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
[Route("api/v1/institutions/{institutionId:guid}/branches")]
[Authorize]
public class BranchesController : ControllerBase
{
    private readonly IBranchService _branchService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<BranchesController> _logger;

    public BranchesController(
        IBranchService branchService,
        ICurrentUserService currentUserService,
        ILogger<BranchesController> logger)
    {
        _branchService = branchService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    [HttpGet]
    [Permission(PermissionKey.BranchesList)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<BranchResponse>>>> GetAll(
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        try
        {
            var branches = await _branchService.GetByInstitutionAsync(institutionId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<BranchResponse>>.Ok(branches));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyCollection<BranchResponse>>.Fail(ex.Message));
        }
    }

    [HttpPost]
    [Permission(PermissionKey.BranchesCreate)]
    public async Task<ActionResult<ApiResponse<BranchResponse>>> Create(Guid institutionId, [FromBody] CreateBranchRequest request, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
            {
                throw new UnauthorizedAccessException("User is not authenticated.");
            }

            var userId = Guid.Parse(_currentUserService.UserId);
            var branch = await _branchService.CreateAsync(institutionId, request, Guid.Parse(_currentUserService.UserId), cancellationToken);
            return Ok(ApiResponse<BranchResponse>.Ok(branch, "Branch created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Create branch failed for institution {InstitutionId}", institutionId);
            return BadRequest(ApiResponse<BranchResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("{branchId:guid}")]
    [Permission(PermissionKey.BranchesView)]
    public async Task<ActionResult<ApiResponse<BranchResponse>>> GetById(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        var branch = await _branchService.GetByIdAsync(institutionId, branchId, cancellationToken);
        if (branch is null)
        {
            return NotFound(ApiResponse<BranchResponse>.Fail("Branch not found."));
        }

        return Ok(ApiResponse<BranchResponse>.Ok(branch));
    }

    [HttpPut("{branchId:guid}")]
    [Permission(PermissionKey.BranchesUpdate)]
    public async Task<ActionResult<ApiResponse<BranchResponse>>> Update(
        Guid institutionId,
        Guid branchId,
        [FromBody] UpdateBranchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var branch = await _branchService.UpdateAsync(institutionId, branchId, request, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<BranchResponse>.Ok(branch, "Branch updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<BranchResponse>.Fail(ex.Message));
        }
    }

    [HttpDelete("{branchId:guid}")]
    [Permission(PermissionKey.BranchesDelete)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _branchService.DeleteAsync(institutionId, branchId, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(new { message = "Branch deleted successfully." }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpGet("{branchId:guid}/analytics")]
    [Permission(PermissionKey.BranchesView)]
    public async Task<ActionResult<ApiResponse<OrganizationAnalyticsResponse>>> GetAnalytics(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        try
        {
            var analytics = await _branchService.GetAnalyticsAsync(institutionId, branchId, cancellationToken);
            return Ok(ApiResponse<OrganizationAnalyticsResponse>.Ok(analytics));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<OrganizationAnalyticsResponse>.Fail(ex.Message));
        }
    }
}
