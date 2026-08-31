using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.CustomerReviews;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/customer-reviews")]
public class CustomerReviewsController : ControllerBase
{
    private readonly ICustomerReviewService _customerReviewService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<CustomerReviewsController> _logger;

    public CustomerReviewsController(
        ICustomerReviewService customerReviewService,
        ICurrentUserService currentUserService,
        ILogger<CustomerReviewsController> logger)
    {
        _customerReviewService = customerReviewService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Submit a new customer review & suggestion from the public landing page.
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CustomerReviewResponse>>> Submit(
        [FromBody] CreateCustomerReviewRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<CustomerReviewResponse>.Fail("Invalid review data provided."));
        }

        try
        {
            var result = await _customerReviewService.SubmitReviewAsync(request, cancellationToken);
            return Ok(ApiResponse<CustomerReviewResponse>.Ok(result, "Thank you! Your review has been submitted and will appear on the landing page after verification."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit customer review.");
            return BadRequest(ApiResponse<CustomerReviewResponse>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// Get all approved customer reviews for public landing page display.
    /// </summary>
    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PublicCustomerReviewResponse>>>> GetPublicApproved(
        CancellationToken cancellationToken)
    {
        var list = await _customerReviewService.GetPublicApprovedReviewsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<PublicCustomerReviewResponse>>.Ok(list));
    }

    /// <summary>
    /// SuperAdmin / Admin endpoint to list all customer reviews with status filter.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<CustomerReviewResponse>>>> GetAll(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var list = await _customerReviewService.GetAllReviewsAsync(status, search, cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<CustomerReviewResponse>>.Ok(list));
    }

    /// <summary>
    /// SuperAdmin endpoint to approve a customer review.
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<CustomerReviewResponse>>> Approve(
        Guid id,
        [FromBody] ApproveCustomerReviewRequest? request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _customerReviewService.ApproveReviewAsync(
                id,
                request ?? new ApproveCustomerReviewRequest(),
                _currentUserService.UserId,
                cancellationToken);

            return Ok(ApiResponse<CustomerReviewResponse>.Ok(result, "Customer review approved successfully."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<CustomerReviewResponse>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to approve customer review {Id}", id);
            return BadRequest(ApiResponse<CustomerReviewResponse>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// SuperAdmin endpoint to reject a customer review.
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<CustomerReviewResponse>>> Reject(
        Guid id,
        [FromBody] RejectCustomerReviewRequest? request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _customerReviewService.RejectReviewAsync(
                id,
                request ?? new RejectCustomerReviewRequest(),
                _currentUserService.UserId,
                cancellationToken);

            return Ok(ApiResponse<CustomerReviewResponse>.Ok(result, "Customer review rejected."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<CustomerReviewResponse>.Fail(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reject customer review {Id}", id);
            return BadRequest(ApiResponse<CustomerReviewResponse>.Fail(ex.Message));
        }
    }

    /// <summary>
    /// SuperAdmin endpoint to soft delete a customer review.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deleted = await _customerReviewService.DeleteReviewAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(ApiResponse<bool>.Fail("Customer review not found."));
        }

        return Ok(ApiResponse<bool>.Ok(true, "Customer review deleted successfully."));
    }
}
