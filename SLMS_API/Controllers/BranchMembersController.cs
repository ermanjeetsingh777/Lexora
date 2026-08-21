using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/members")]
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
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberListResponse>>>> GetMembers(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out _))
        {
            return Unauthorized();
        }

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
