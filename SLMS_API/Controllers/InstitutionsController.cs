using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions")]
[Authorize]
public class InstitutionsController : ControllerBase
{
    private readonly IInstitutionService _institutionService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<InstitutionsController> _logger;

    public InstitutionsController(
        IInstitutionService institutionService,
        ICurrentUserService currentUserService,
        ILogger<InstitutionsController> logger)
    {
        _institutionService = institutionService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    [HttpGet]
    [Permission(PermissionKey.InstitutionsList)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<InstitutionResponse>>>> GetAll(CancellationToken cancellationToken)
    {
        var institutions = await _institutionService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<InstitutionResponse>>.Ok(institutions));
    }

    [HttpGet("list")]
    [Permission(PermissionKey.InstitutionsList)]
    public async Task<ActionResult<ApiResponse<InstitutionListViewResponse>>> GetListView(
        [FromQuery] InstitutionListQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _institutionService.GetListViewAsync(query, userId, cancellationToken);
        return Ok(ApiResponse<InstitutionListViewResponse>.Ok(view));
    }

    [HttpGet("{id:guid}/overview")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<InstitutionOverviewResponse>>> GetOverview(Guid id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var overview = await _institutionService.GetOverviewAsync(id, userId, cancellationToken);
        if (overview is null)
        {
            return NotFound(ApiResponse<InstitutionOverviewResponse>.Fail("Institution not found."));
        }

        return Ok(ApiResponse<InstitutionOverviewResponse>.Ok(overview));
    }

    [HttpGet("{id:guid}/billing")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<InstitutionBillingResponse>>> GetBilling(Guid id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var billing = await _institutionService.GetBillingAsync(id, userId, cancellationToken);
        if (billing is null)
        {
            return NotFound(ApiResponse<InstitutionBillingResponse>.Fail("Institution not found."));
        }

        return Ok(ApiResponse<InstitutionBillingResponse>.Ok(billing));
    }

    [HttpGet("{id:guid}/branches-view")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<InstitutionBranchesViewResponse>>> GetBranchesView(
        Guid id,
        [FromQuery] InstitutionBranchListQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _institutionService.GetBranchesViewAsync(id, query, userId, cancellationToken);
        if (view is null)
        {
            return NotFound(ApiResponse<InstitutionBranchesViewResponse>.Fail("Institution not found."));
        }

        return Ok(ApiResponse<InstitutionBranchesViewResponse>.Ok(view));
    }

    [HttpGet("{id:guid}/libraries-view")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<InstitutionLibrariesViewResponse>>> GetLibrariesView(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _institutionService.GetLibrariesViewAsync(id, userId, cancellationToken);
        if (view is null)
        {
            return NotFound(ApiResponse<InstitutionLibrariesViewResponse>.Fail("Institution not found."));
        }

        return Ok(ApiResponse<InstitutionLibrariesViewResponse>.Ok(view));
    }

    [HttpGet("my-institution")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<InstitutionCardResponse>>> GetInstitutionByUserId(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        var userId = Guid.Parse(_currentUserService.UserId);

        var institution = await _institutionService.GetInstitutionByUserIdAsync(userId, cancellationToken);

        if (institution == null)
            return NotFound("Institution not found.");

        return Ok(ApiResponse<InstitutionCardResponse>.Ok(institution, ""));
    }


    [HttpGet("dropdown")]
    public async Task<ActionResult<ApiResponse<InstitutionDropdownResponse>>> GetDropdown(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var result = await _institutionService.GetInstitutionDropdownAsync(userId, cancellationToken);

        return Ok(ApiResponse<List<InstitutionDropdownResponse>>.Ok(result));
    }

    [HttpPost]
    [Permission(PermissionKey.InstitutionsCreate)]
    public async Task<ActionResult<ApiResponse<InstitutionResponse>>> Create([FromBody] CreateInstitutionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
            {
                throw new UnauthorizedAccessException("User is not authenticated.");
            }

            var institution = await _institutionService.CreateAsync(request, Guid.Parse(_currentUserService.UserId), cancellationToken);
            return Ok(ApiResponse<InstitutionResponse>.Ok(institution, "Institution created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Create institution failed for {Name}", request.Name);
            return BadRequest(ApiResponse<InstitutionResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("{id:guid}")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<InstitutionResponse>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var institution = await _institutionService.GetByIdAsync(id, userId, cancellationToken);
        if (institution is null)
        {
            return NotFound(ApiResponse<InstitutionResponse>.Fail("Institution not found."));
        }

        return Ok(ApiResponse<InstitutionResponse>.Ok(institution));
    }

    [HttpPut("{id:guid}")]
    [Permission(PermissionKey.InstitutionsUpdate)]
    public async Task<ActionResult<ApiResponse<InstitutionResponse>>> Update(
        Guid id,
        [FromBody] UpdateInstitutionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_currentUserService.UserId))
            {
                throw new UnauthorizedAccessException("User is not authenticated.");
            }

            var userId = Guid.Parse(_currentUserService.UserId);
            var institution = await _institutionService.UpdateAsync(id, request, Guid.Parse(_currentUserService.UserId), cancellationToken);
            return Ok(ApiResponse<InstitutionResponse>.Ok(institution, "Institution updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<InstitutionResponse>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<InstitutionResponse>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    [Permission(PermissionKey.InstitutionsDelete)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await _institutionService.DeleteAsync(id, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(new { message = "Institution deleted successfully." }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpGet("{id:guid}/quick-view")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<InstitutionQuickViewResponse>>> GetQuickView(
        Guid id,
        [FromQuery] InstitutionQuickViewQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        var view = await _institutionService.GetQuickViewAsync(id, userId, query, cancellationToken);
        if (view is null)
        {
            return NotFound(ApiResponse<InstitutionQuickViewResponse>.Fail("Institution not found."));
        }

        return Ok(ApiResponse<InstitutionQuickViewResponse>.Ok(view));
    }

    [HttpGet("{id:guid}/analytics")]
    [Permission(PermissionKey.InstitutionsView)]
    public async Task<ActionResult<ApiResponse<OrganizationAnalyticsResponse>>> GetAnalytics(Guid id, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var analytics = await _institutionService.GetAnalyticsAsync(id, userId, cancellationToken);
            return Ok(ApiResponse<OrganizationAnalyticsResponse>.Ok(analytics));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<OrganizationAnalyticsResponse>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<OrganizationAnalyticsResponse>.Fail(ex.Message));
        }
    }
}
