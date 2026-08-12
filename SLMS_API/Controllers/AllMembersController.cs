using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyModel;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers
{
    [ApiController]
    [Route("api/v1/members")]
    [Authorize]
    public class AllMembersController : Controller
    {
        private readonly IMemberService _memberService;
        private readonly ICurrentUserService _currentUserService;

        public AllMembersController(IMemberService memberService, ICurrentUserService currentUserService)
        {
            _memberService = memberService;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        //[Permission(PermissionKey.MembersManage)]
        public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberListResponse>>>> GetAll(CancellationToken cancellationToken)
        {
            try
            {
                var members = await _memberService.GetAllMemberListAsync(cancellationToken);

                return Ok(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Ok(members));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Fail(ex.Message));
            }
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<MembershipSummaryResponse>>> GetSummary(CancellationToken cancellationToken)
        {
            try
            {
                var summary = await _memberService.GetMembershipSummaryAsync(cancellationToken);
                return Ok(ApiResponse<MembershipSummaryResponse>.Ok(summary));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MembershipSummaryResponse>.Fail(ex.Message));
            }
        }

        [HttpGet("{memberId:guid}")]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> GetById(Guid memberId, CancellationToken cancellationToken)
        {
            try
            {

                var member = await _memberService.GetMemberDetailsByIdAsync(memberId, cancellationToken);

                if (member is null)
                {
                    return NotFound(ApiResponse<MemberDetailResponse>.Fail("Member not found."));
                }

                return Ok(ApiResponse<MemberDetailResponse>.Ok(member));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/contacts")]
        //[Permission(PermissionKey.MembersManage)]
        public async Task<ActionResult<ApiResponse<MemberContactResponse>>> AddContact( Guid memberId, [FromBody] CreateMemberContactRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var contact = await _memberService.AddContactAsync(memberId, request, _currentUserService.UserId, cancellationToken);

                return Ok(ApiResponse<MemberContactResponse>.Ok( contact, "Member contact added successfully."));
            }
            catch (InvalidOperationException ex)
            {
                //_logger.LogWarning(ex, "Add contact failed for member {MemberId}", memberId);

                return BadRequest( ApiResponse<MemberContactResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/plan-or-shift")]
        //[Permission(PermissionKey.MembersManage)]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> ChangePlanOrShift(Guid memberId, [FromBody] ChangeMemberPlanShiftRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var member = await _memberService.ChangePlanOrShiftAsync(memberId, request, _currentUserService.UserId, cancellationToken);

                return Ok(ApiResponse<MemberDetailResponse>.Ok(member, request.PlanId.HasValue ? "Member plan changed successfully.": "Member shift changed successfully."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

        [HttpPost("{memberId:guid}/renew")]
        public async Task<ActionResult<ApiResponse<MemberDetailResponse>>> RenewMembership(Guid memberId, CancellationToken cancellationToken)
        {
            try
            {
                var member = await _memberService.RenewMembershipAsync(memberId, _currentUserService.UserId, cancellationToken);
                var expiryLabel = member.PlanEndDate?.ToString("dd MMM yyyy") ?? "—";
                var message = $"{member.Name} renewed — valid until {expiryLabel}";

                return Ok(ApiResponse<MemberDetailResponse>.Ok(member, message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MemberDetailResponse>.Fail(ex.Message));
            }
        }

    }
}
