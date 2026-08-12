using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class BranchService : IBranchService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuthService _authService;

    public BranchService(ApplicationDbContext dbContext, IAuthService authService)
    {
        _dbContext = dbContext;
        _authService = authService;
    }

    public async Task<IReadOnlyCollection<BranchResponse>> GetByInstitutionAsync(Guid institutionId, CancellationToken cancellationToken = default)
    {
        await EnsureInstitutionExistsAsync(institutionId, cancellationToken);

        return await _dbContext.Branches
            .AsNoTracking()
            .Where(x => x.InstitutionId == institutionId && !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => ToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<BranchResponse?> GetByIdAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken);

        return entity is null ? null : ToResponse(entity);
    }

    public async Task<BranchResponse> CreateAsync(Guid institutionId, CreateBranchRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var institution = await _dbContext.Institutions.FirstOrDefaultAsync(x => x.Id == institutionId && !x.IsDeleted, cancellationToken)  ?? throw new InvalidOperationException("Institution not found.");

        var entity = new Branch
        {
            InstitutionId = institutionId,
            Name = request.Name,
            Description = request.Description,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            City = request.City,
            OperatingHoursStart = request.OpenAt,
            OperatingHoursEnd = request.ClosesAt,
            Capacity = request.Capacity,
            IsActive = request.IsActive,
            Status = request.Status,
            CreatedBy = userId.ToString()
        };

        _dbContext.Branches.Add(entity);

        _dbContext.UserBranches.Add(new UserBranch
        {
            UserId = userId.ToString(),
            InstitutionId = institutionId,
            Branch = entity,          // EF Core sets BranchId automatically
            IsPrimary = request.IsPrimary,
            IsActive = true,
            AssignedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        if (request.IsOnboarding)
        {
            await _authService.UpdateOnboardingStepAsync(userId.ToString(), OnboardingStep.Branch, cancellationToken);
        }

        

        return ToResponse(entity);
    }

    public async Task<BranchResponse> UpdateAsync(Guid institutionId, Guid branchId, UpdateBranchRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Branches
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        if (request.Name is not null) entity.Name = request.Name;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.Address is not null) entity.Address = request.Address;
        if (request.City is not null) entity.City = request.City;
        if (request.Latitude.HasValue) entity.Latitude = request.Latitude;
        if (request.Longitude.HasValue) entity.Longitude = request.Longitude;
        if (request.OperatingHoursStart.HasValue) entity.OperatingHoursStart = request.OperatingHoursStart;
        if (request.OperatingHoursEnd.HasValue) entity.OperatingHoursEnd = request.OperatingHoursEnd;
        if (request.Capacity.HasValue) entity.Capacity = request.Capacity;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;

        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteAsync(Guid institutionId, Guid branchId, string? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Branches
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        entity.IsDeleted = true;
        entity.DeletedAtUtc = DateTime.UtcNow;
        entity.IsActive = false;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<OrganizationAnalyticsResponse> GetAnalyticsAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        var branch = await _dbContext.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Branch not found.");

        var libraryCount = await _dbContext.Libraries.CountAsync(x => x.BranchId == branch.Id && !x.IsDeleted, cancellationToken);
        var activeLibraryCount = await _dbContext.Libraries.CountAsync(x => x.BranchId == branch.Id && !x.IsDeleted && x.IsActive, cancellationToken);

        return new OrganizationAnalyticsResponse
        {
            BranchCount = 1,
            ActiveBranchCount = branch.IsActive ? 1 : 0,
            LibraryCount = libraryCount,
            ActiveLibraryCount = activeLibraryCount
        };
    }

    private async Task EnsureInstitutionExistsAsync(Guid institutionId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Institutions.AnyAsync(x => x.Id == institutionId && !x.IsDeleted, cancellationToken);
        if (!exists)
        {
            throw new InvalidOperationException("Institution not found.");
        }
    }

    private static BranchResponse ToResponse(Branch entity) =>
        new()
        {
            Id = entity.Id,
            InstitutionId = entity.InstitutionId,
            Name = entity.Name,
            Description = entity.Description,
            Address = entity.Address,
            City = entity.City,
            Latitude = entity.Latitude,
            Longitude = entity.Longitude,
            OperatingHoursStart = entity.OperatingHoursStart,
            OperatingHoursEnd = entity.OperatingHoursEnd,
            Capacity = entity.Capacity,
            IsActive = entity.IsActive,
            CreatedAtUtc = entity.CreatedAtUtc,
            Status = entity.Status,
        };
}
