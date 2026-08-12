using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Contracts.Plan;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers
{

    [ApiController]
    [Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/libraries/{libraryId:guid}/plans")]
    [Authorize]
    public class PlansController : ControllerBase
    {
        private readonly IPlanService _planService;
        private readonly ICurrentUserService _currentUserService;
        private readonly ILogger<PlansController> _logger;

        public PlansController(
            IPlanService planService,
            ICurrentUserService currentUserService,
            ILogger<PlansController> logger)
        {
            _planService = planService;
            _currentUserService = currentUserService;
            _logger = logger;
        }

        [HttpGet]
        //[Permission(PermissionKey.PlansManage)]
        public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PlanResponse>>>> GetAll(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken)
        {
            try
            {
                var plans = await _planService.GetByLibraryAsync(
                    institutionId,
                    branchId,
                    libraryId,
                    cancellationToken);

                return Ok(ApiResponse<IReadOnlyCollection<PlanResponse>>.Ok(plans));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<IReadOnlyCollection<PlanResponse>>.Fail(ex.Message));
            }
        }

        [HttpPost]
        //[Permission(PermissionKey.PlansManage)]
        public async Task<ActionResult<ApiResponse<PlanResponse>>> Create(Guid institutionId, Guid branchId, Guid libraryId, [FromBody] CreatePlanRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var plan = await _planService.CreateAsync(
                    institutionId,
                    branchId,
                    libraryId,
                    request,
                    _currentUserService.UserId,
                    cancellationToken);

                return Ok(ApiResponse<PlanResponse>.Ok(plan, "Plan created successfully."));
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Create plan failed for library {LibraryId}", libraryId);

                return BadRequest(ApiResponse<PlanResponse>.Fail(ex.Message));
            }
        }

        [HttpGet("{planId:guid}")]
        //[Permission(PermissionKey.PlansManage)]
        public async Task<ActionResult<ApiResponse<PlanResponse>>> GetById(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, CancellationToken cancellationToken)
        {
            var plan = await _planService.GetByIdAsync(
                institutionId,
                branchId,
                libraryId,
                planId,
                cancellationToken);

            if (plan is null)
            {
                return NotFound(ApiResponse<PlanResponse>.Fail("Plan not found."));
            }

            return Ok(ApiResponse<PlanResponse>.Ok(plan));
        }

        [HttpPut("{planId:guid}")]
        //[Permission(PermissionKey.PlansManage)]
        public async Task<ActionResult<ApiResponse<PlanResponse>>> Update(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, [FromBody] UpdatePlanRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var plan = await _planService.UpdateAsync(
                    institutionId,
                    branchId,
                    libraryId,
                    planId,
                    request,
                    _currentUserService.UserId,
                    cancellationToken);

                return Ok(ApiResponse<PlanResponse>.Ok(plan, "Plan updated successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<PlanResponse>.Fail(ex.Message));
            }
        }

        [HttpDelete("{planId:guid}")]
        //[Permission(PermissionKey.PlansManage)]
        public async Task<ActionResult<ApiResponse<object>>> Delete(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, CancellationToken cancellationToken)
        {
            try
            {
                await _planService.DeleteAsync(
                    institutionId,
                    branchId,
                    libraryId,
                    planId,
                    _currentUserService.UserId,
                    cancellationToken);

                return Ok(ApiResponse<object>.Ok(new
                {
                    message = "Plan deleted successfully."
                }));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
        [HttpPatch("{planId:guid}/activate")]
        /* [Permission(PermissionKey.PlansManage)]*/
        public async Task<ActionResult<ApiResponse<PlanResponse>>> Activate(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _planService.SetActiveStatusAsync(
                    institutionId,
                    branchId,
                    libraryId,
                    planId,
                    true,
                    _currentUserService.UserId,
                    cancellationToken);

                return Ok(ApiResponse<PlanResponse>.Ok(result, "Plan activated successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<PlanResponse>.Fail(ex.Message));
            }
        }
        [HttpPatch("{planId:guid}/deactivate")]
        //[Permission(PermissionKey.PlansManage)]
        public async Task<ActionResult<ApiResponse<PlanResponse>>> Deactivate(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _planService.SetActiveStatusAsync(
                    institutionId,
                    branchId,
                    libraryId,
                    planId,
                    false,
                    _currentUserService.UserId,
                    cancellationToken);

                return Ok(ApiResponse<PlanResponse>.Ok(result, "Plan deactivated successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<PlanResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("bulk")]
        //[Permission(PermissionKey.PlansManage)]
        public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PlanResponse>>>> BulkCreate(Guid institutionId, Guid branchId, Guid libraryId, [FromBody] IReadOnlyCollection<CreatePlanRequest> requests, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _planService.BulkCreateAsync(
                    institutionId,
                    branchId,
                    libraryId,
                    requests,
                    _currentUserService.UserId,
                    cancellationToken);

                return Ok(ApiResponse<IReadOnlyCollection<PlanResponse>>.Ok(result, "Plans created successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<IReadOnlyCollection<PlanResponse>>.Fail(ex.Message));
            }
        }
    }
}
