using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Queries;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/members")]
[Authorize]
public class BranchMembersController : ControllerBase
{
    private readonly IMemberService _memberService;
    private readonly ICurrentUserService _currentUserService;

    public BranchMembersController(
        IMemberService memberService,
        ICurrentUserService currentUserService)
    {
        _memberService = memberService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Permission(PermissionKey.MembersList)]
    public async Task<ActionResult<ApiResponse<PagedResult<MemberListResponse>>>> GetMembers(
        Guid institutionId,
        Guid branchId,
        [FromQuery] MemberListQuery query,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out _))
        {
            return Unauthorized();
        }

        try
        {
            var members = await _memberService.GetBranchMemberListAsync(institutionId, branchId, query ?? new MemberListQuery(), cancellationToken);
            return Ok(ApiResponse<PagedResult<MemberListResponse>>.Ok(members));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<PagedResult<MemberListResponse>>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<PagedResult<MemberListResponse>>.Fail(ex.Message));
        }
    }
}
