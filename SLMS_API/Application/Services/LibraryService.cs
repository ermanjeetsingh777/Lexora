using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Organizations.Requests;
using SLMS_API.Application.Contracts.Organizations.Responses;
using SLMS_API.Application.Contracts.Plan;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class LibraryService : ILibraryService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuthService _authService;
    private readonly IPlanService _planService;

    public LibraryService(ApplicationDbContext dbContext, IAuthService authService, IPlanService planService)
    {
        _dbContext = dbContext;
        _authService = authService;
        _planService = planService;
    }

    public async Task<IReadOnlyCollection<LibraryResponse>> GetByBranchAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        return await _dbContext.Libraries
          .AsNoTracking()
          .Where(x => x.BranchId == branchId && !x.IsDeleted)
          .OrderBy(x => x.Name)
          .Select(x => ToResponse(x))
          .ToListAsync(cancellationToken);
    }

    public async Task<LibraryResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        var entity = await _dbContext.Libraries
          .AsNoTracking()
          .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Id == libraryId && !x.IsDeleted, cancellationToken);

        return entity is null ? null : ToResponse(entity);
    }

    public async Task<LibraryResponse> CreateAsync(Guid institutionId, Guid branchId, CreateLibraryRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        var branch = await _dbContext.Branches.FirstOrDefaultAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken) ?? throw new InvalidOperationException("Branch not found.");

        var library = new Library
        {
            BranchId = branchId,
            InstitutionId = institutionId,
            Name = request.Name,
            Description = request.Description,
            Address = request.Address,
            Floor = request.Floor,
            Capacity = request.Capacity,
            IsActive = request.IsActive,
            CreatedBy = userId,
            Status = request.Status,
        };

        _dbContext.Libraries.Add(library);
        // Create mapping with the logged-in user
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var userLibrary = new UserLibrary
            {
                UserId = userId,
                InstitutionId = institutionId,
                BranchId = branchId,
                Library = library, // EF will populate LibraryId after SaveChanges
                AssignedAtUtc = DateTime.UtcNow,
                IsPrimary = request.IsPrimary,
                IsActive = true
            };

            _dbContext.UserLibraries.Add(userLibrary);
        }
        await _dbContext.SaveChangesAsync(cancellationToken);
        await CreateDefaultPlansAsync(institutionId, branchId, library, userId.ToString(), cancellationToken);

        if (request.IsOnboarding)
        {
            await _authService.UpdateOnboardingStepAsync(userId.ToString(), OnboardingStep.Completed, cancellationToken);
        }

        return ToResponse(library);
    }

    public async Task<LibraryResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid libraryId, UpdateLibraryRequest request, string? userId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        var entity = await _dbContext.Libraries
          .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Id == libraryId && !x.IsDeleted, cancellationToken)
          ?? throw new InvalidOperationException("Library not found.");

        if (request.Name is not null) entity.Name = request.Name;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.Floor.HasValue) entity.Floor = request.Floor;
        if (request.Capacity.HasValue) entity.Capacity = request.Capacity;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;

        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(entity);
    }

    public async Task DeleteAsync(Guid institutionId, Guid branchId, Guid libraryId, string? userId, CancellationToken cancellationToken = default)
    {
        await EnsureBranchExistsAsync(institutionId, branchId, cancellationToken);

        var entity = await _dbContext.Libraries
          .FirstOrDefaultAsync(x => x.BranchId == branchId && x.Id == libraryId && !x.IsDeleted, cancellationToken)
          ?? throw new InvalidOperationException("Library not found.");

        entity.IsDeleted = true;
        entity.DeletedAtUtc = DateTime.UtcNow;
        entity.IsActive = false;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureBranchExistsAsync(Guid institutionId, Guid branchId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Branches
          .AnyAsync(x => x.InstitutionId == institutionId && x.Id == branchId && !x.IsDeleted, cancellationToken);
        if (!exists)
        {
            throw new InvalidOperationException("Branch not found.");
        }
    }

    private static LibraryResponse ToResponse(Library entity) =>
  new()
  {
      Id = entity.Id,
      BranchId = entity.BranchId,
      Name = entity.Name,
      Description = entity.Description,
      Floor = entity.Floor,
      Capacity = entity.Capacity,
      IsActive = entity.IsActive,
      CreatedAtUtc = entity.CreatedAtUtc,
      Status = entity.Status,
  };

    private async Task CreateDefaultPlansAsync(Guid institutionId, Guid branchId, Library library,string userId, CancellationToken cancellationToken)
    {
        var defaultPlans = new List<CreatePlanRequest>
    {
      new ()
      {
        Name = "Monthly",
          Description = "30 Days Access",
          Price = 800,
          DurationInDays = 30,
          MaxSeats = library.Capacity,
          IsActive = true
      },
      new ()
      {
        Name = "Quarterly",
          Description = "90 Days Access",
          Price = 2200,
          DurationInDays = 90,
          MaxSeats = library.Capacity,
          IsActive = true
      },
      new ()
      {
        Name = "Half Yearly",
          Description = "180 Days Access",
          Price = 4200,
          DurationInDays = 180,
          MaxSeats = library.Capacity,
          IsActive = true
      },
      new ()
      {
        Name = "Yearly",
          Description = "365 Days Access",
          Price = 8000,
          DurationInDays = 365,
          MaxSeats = library.Capacity,
          IsActive = true
      }
    };
        await _planService.BulkCreateAsync(institutionId, branchId, library.Id, defaultPlans, userId, cancellationToken);

    }
}
