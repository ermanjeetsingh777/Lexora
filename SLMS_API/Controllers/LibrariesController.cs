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
[Route("api/v1/institutions/{institutionId:guid}/branches/{branchId:guid}/libraries")]
[Authorize]
public class LibrariesController : ControllerBase
{
    private readonly ILibraryService _libraryService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<LibrariesController> _logger;
   

    public LibrariesController(
        ILibraryService libraryService,
        ICurrentUserService currentUserService,
        ILogger<LibrariesController> logger)
    {
        _libraryService = libraryService;
        _currentUserService = currentUserService;
        _logger = logger;       
    }

    [HttpGet]
    [Permission(PermissionKey.LibrariesManage)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<LibraryResponse>>>> GetAll(
        Guid institutionId,
        Guid branchId,
        CancellationToken cancellationToken)
    {
        try
        {
            var libraries = await _libraryService.GetByBranchAsync(institutionId, branchId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyCollection<LibraryResponse>>.Ok(libraries));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<IReadOnlyCollection<LibraryResponse>>.Fail(ex.Message));
        }
    }

    [HttpPost]
    //[Permission(PermissionKey.LibrariesManage)]
    public async Task<ActionResult<ApiResponse<LibraryResponse>>> Create(Guid institutionId, Guid branchId, [FromBody] CreateLibraryRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var library = await _libraryService.CreateAsync(institutionId, branchId, request, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<LibraryResponse>.Ok(library, "Library created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Create library failed for branch {BranchId}", branchId);
            return BadRequest(ApiResponse<LibraryResponse>.Fail(ex.Message));
        }
    }

    [HttpGet("{libraryId:guid}")]
    [Permission(PermissionKey.LibrariesManage)]
    public async Task<ActionResult<ApiResponse<LibraryResponse>>> GetById(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken)
    {
        var library = await _libraryService.GetByIdAsync(institutionId, branchId, libraryId, cancellationToken);
        if (library is null)
        {
            return NotFound(ApiResponse<LibraryResponse>.Fail("Library not found."));
        }

        return Ok(ApiResponse<LibraryResponse>.Ok(library));
    }

    [HttpPut("{libraryId:guid}")]
    [Permission(PermissionKey.LibrariesManage)]
    public async Task<ActionResult<ApiResponse<LibraryResponse>>> Update(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        [FromBody] UpdateLibraryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var library = await _libraryService.UpdateAsync(institutionId, branchId, libraryId, request, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<LibraryResponse>.Ok(library, "Library updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LibraryResponse>.Fail(ex.Message));
        }
    }

    [HttpDelete("{libraryId:guid}")]
    [Permission(PermissionKey.LibrariesManage)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(
        Guid institutionId,
        Guid branchId,
        Guid libraryId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _libraryService.DeleteAsync(institutionId, branchId, libraryId, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(new { message = "Library deleted successfully." }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }
}
