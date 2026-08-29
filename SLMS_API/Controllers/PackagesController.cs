using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SLMS_API.Application.Contracts.Common;
using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;

namespace SLMS_API.Controllers;

[ApiController]
[Route("api/v1/packages")]
public class PackagesController : ControllerBase
{
    private readonly IPackageService _packageService;
    private readonly ICurrentUserService _currentUserService;

    public PackagesController(IPackageService packageService, ICurrentUserService currentUserService)
    {
        _packageService = packageService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PackageResponse>>>> GetActive(CancellationToken cancellationToken)
    {
        var packages = await _packageService.GetActiveAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<PackageResponse>>.Ok(packages));
    }

    [HttpGet("all")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<PackageResponse>>>> GetAll(CancellationToken cancellationToken)
    {
        var packages = await _packageService.GetAllAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyCollection<PackageResponse>>.Ok(packages));
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PackageResponse>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var package = await _packageService.GetByIdAsync(id, cancellationToken);
        if (package == null)
            return NotFound(ApiResponse<PackageResponse>.Fail("Package not found."));

        return Ok(ApiResponse<PackageResponse>.Ok(package));
    }

    [HttpPost]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<PackageResponse>>> Create([FromBody] CreatePackageRequest request, CancellationToken cancellationToken)
    {
        var package = await _packageService.CreateAsync(request, _currentUserService.UserId, cancellationToken);
        return Ok(ApiResponse<PackageResponse>.Ok(package, "Package created successfully."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<PackageResponse>>> Update(Guid id, [FromBody] UpdatePackageRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var package = await _packageService.UpdateAsync(id, request, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<PackageResponse>.Ok(package, "Package updated successfully."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<PackageResponse>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleDefinitions.SuperAdmin)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await _packageService.DeleteAsync(id, _currentUserService.UserId, cancellationToken);
            return Ok(ApiResponse<object>.Ok(new { message = "Package deleted successfully." }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(ex.Message));
        }
    }
}
