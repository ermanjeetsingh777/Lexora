using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Auth.Responses;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/libraries/{libraryId:guid}/members")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly IMemberService _memberService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<MembersController> _logger;

    public MembersController(IMemberService memberService, ICurrentUserService currentUserService, ILogger<MembersController> logger)
    {
        _memberService = memberService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    //[HttpGet]
    ////[Permission(PermissionKey.MembersView)]
    //public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberResponse>>>> GetAll(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken)
    //{
    //    var items = await _memberService.GetByLibraryAsync(institutionId, branchId, libraryId, cancellationToken);
    //    return Ok(ApiResponse<IReadOnlyCollection<MemberResponse>>.Ok(items));
    //}

    [HttpPost]
    //[Permission(PermissionKey.MembersManage)]
    public async Task<ActionResult<ApiResponse<MemberResponse>>> Create(Guid institutionId, Guid branchId, Guid libraryId, [FromBody] CreateMemberRequest request, CancellationToken cancellationToken)
    {
        
        try
        {
            var userId = _currentUserService.UserId;
            var item = await _memberService.CreateAsync(institutionId, branchId, libraryId, request, userId, cancellationToken);
            return Ok(ApiResponse<MemberResponse>.Ok(item, "Member created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Registration failed for {Email}", request.Email);
            return BadRequest(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpGet]
    //[Permission(PermissionKey.MembersManage)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<MemberListResponse>>>> GetLibraryMemberListAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken)
    {
        try
        {
            var members = await _memberService.GetLibraryMemberListAsync(institutionId, branchId, libraryId, cancellationToken);

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

    //[HttpGet("{memberId:guid}")]
    ////[Permission(PermissionKey.MembersView)]
    //public async Task<ActionResult<ApiResponse<MemberResponse>>> GetById(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, CancellationToken cancellationToken)
    //{
    //    var item = await _memberService.GetByIdAsync(institutionId, branchId, libraryId, memberId, cancellationToken);
    //    if (item is null) return NotFound(ApiResponse<MemberResponse>.Fail("Member not found."));
    //    return Ok(ApiResponse<MemberResponse>.Ok(item));
    //}

    //[HttpPut("{memberId:guid}")]
    ////[Permission(PermissionKey.MembersManage)]
    //public async Task<ActionResult<ApiResponse<MemberResponse>>> Update(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, [FromBody] UpdateMemberRequest request, CancellationToken cancellationToken)
    //{
    //    var userId = _currentUserService.UserId;
    //    var item = await _memberService.UpdateAsync(institutionId, branchId, libraryId, memberId, request, userId, cancellationToken);
    //    return Ok(ApiResponse<MemberResponse>.Ok(item, "Member updated successfully."));
    //}

    //[HttpDelete("{memberId:guid}")]
    //[Permission(PermissionKey.MembersManage)]
    //public async Task<ActionResult<ApiResponse<object>>> Delete(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, CancellationToken cancellationToken)
    //{
    //    var userId = _currentUserService.UserId;
    //    await _memberService.DeleteAsync(institutionId, branchId, libraryId, memberId, userId, cancellationToken);
    //    return Ok(ApiResponse<object>.Ok(new { message = "Member deleted successfully." }));
    //}

    //[HttpPost("{memberId:guid}/transfer")]
    //[Permission(PermissionKey.MembersManage)]
    //public async Task<ActionResult<ApiResponse<object>>> Transfer(Guid institutionId, Guid branchId, Guid libraryId, Guid memberId, [FromBody] TransferMemberRequest request, CancellationToken cancellationToken)
    //{
    //    var userId = _currentUserService.UserId;
    //    await _memberService.TransferAsync(institutionId, branchId, libraryId, memberId, request, userId, cancellationToken);
    //    return Ok(ApiResponse<object>.Ok(new { message = "Member transferred successfully." }));
    //}
}
