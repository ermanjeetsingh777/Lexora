using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions/{institutionId:guid}/members")]
public class InstitutionMembersController : ControllerBase
{
    private readonly IMemberService _memberService;
    private readonly ICurrentUserService _currentUserService;

    public InstitutionMembersController(
        IMemberService memberService,
        ICurrentUserService currentUserService)
    {
        _memberService = memberService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberListResponse>>>> GetMembers(
        Guid institutionId,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_currentUserService.UserId, out _))
        {
            return Unauthorized();
        }

        try
        {
            var members = await _memberService.GetInstitutionMemberListAsync(institutionId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Ok(members));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Fail(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<IReadOnlyCollection<MemberListResponse>>.Fail(ex.Message));
        }
    }
}
