using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/members")]
[Authorize]
public class BranchMembersController : ControllerBase
{
    private readonly IMemberService _memberService;

    public BranchMembersController(IMemberService memberService)
    {
        _memberService = memberService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberListResponse>>>> GetMembers(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        try
        {
            var members = await _memberService.GetBranchMemberListAsync(institutionId, branchId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Ok(members));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Fail(ex.Message));
        }
    }
}
