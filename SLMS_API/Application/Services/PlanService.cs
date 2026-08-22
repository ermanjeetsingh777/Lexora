using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Plan;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services
{
    public class PlanService : IPlanService
    {
        private readonly ApplicationDbContext _context;

        public PlanService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyCollection<PlanResponse>> GetByLibraryAsync(Guid institutionId, Guid branchId, Guid libraryId, CancellationToken cancellationToken = default)
        {
            return await _context.Plans
                .Where(x =>
                    x.InstitutionId == institutionId &&
                    x.BranchId == branchId &&
                    x.LibraryId == libraryId)
                .Select(x => new PlanResponse
                {
                    Id = x.Id,
                    InstitutionId = x.InstitutionId,
                    BranchId = x.BranchId,
                    LibraryId = x.LibraryId,
                    Name = x.Name,
                    Description = x.Description,
                    Price = x.Price,
                    DurationInDays = x.DurationInDays,
                    MaxSeats = x.MaxSeats,
                    IsActive = x.IsActive,
                    CreatedAtUtc = x.CreatedAtUtc
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<PlanResponse?> GetByIdAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, CancellationToken cancellationToken = default)
        {
            var libraryExists = await _context.Libraries.AnyAsync(x =>
                x.Id == libraryId &&
                x.BranchId == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

            if (!libraryExists)
            {
                throw new InvalidOperationException("Library not found.");
            }

            return await _context.Plans
                .AsNoTracking()
                .Where(x =>
                    x.Id == planId &&
                    x.LibraryId == libraryId)
                .Select(x => new PlanResponse
                {
                    Id = x.Id,
                    InstitutionId = x.InstitutionId,
                    BranchId = x.BranchId,
                    LibraryId = x.LibraryId,
                    Name = x.Name,
                    Description = x.Description,
                    Price = x.Price,
                    DurationInDays = x.DurationInDays,
                    MaxSeats = x.MaxSeats,
                    IsActive = x.IsActive,
                    CreatedAtUtc = x.CreatedAtUtc
                })
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<PlanResponse> CreateAsync(Guid institutionId, Guid branchId, Guid libraryId, CreatePlanRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            // Institution validation
            var institutionExists = await _context.Institutions
                .AnyAsync(x => x.Id == institutionId, cancellationToken);

            if (!institutionExists)
                throw new InvalidOperationException("Institution not found.");

            // Branch validation
            var branchExists = await _context.Branches
                .AnyAsync(x => x.Id == branchId && x.InstitutionId == institutionId, cancellationToken);

            if (!branchExists)
                throw new InvalidOperationException("Branch not found.");

            // Library validation
            var libraryExists = await _context.Libraries
                .AnyAsync(x =>
                    x.Id == libraryId &&
                    x.BranchId == branchId &&
                    x.InstitutionId == institutionId,
                    cancellationToken);

            if (!libraryExists)
                throw new InvalidOperationException("Library not found.");

            // Duplicate Plan Name validation
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new InvalidOperationException("Plan name is required.");

            var duplicatePlan = await _context.Plans.AnyAsync(x =>
                x.LibraryId == libraryId &&
                x.Name.ToLower() == request.Name.Trim().ToLower(),
                cancellationToken);

            if (duplicatePlan)
                throw new InvalidOperationException("A plan with the same name already exists in this library.");

            // Business validations
            if (request.Price <= 0)
                throw new InvalidOperationException("Price must be greater than zero.");

            if (request.DurationInDays <= 0)
                throw new InvalidOperationException("Duration must be greater than zero.");

            //if (request.MaxSeats.HasValue && request.MaxSeats <= 0)
            //    throw new InvalidOperationException("Max seats must be greater than zero.");

            var plan = new Plan
            {
                Id = Guid.NewGuid(),
                InstitutionId = institutionId,
                BranchId = branchId,
                LibraryId = libraryId,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                Price = request.Price,
                DurationInDays = request.DurationInDays,
                MaxSeats = request.MaxSeats,
                IsActive = request.IsActive,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.Plans.Add(plan);

            await _context.SaveChangesAsync(cancellationToken);

            return (await GetByIdAsync(
                institutionId,
                branchId,
                libraryId,
                plan.Id,
                cancellationToken))!;
        }

        public async Task<PlanResponse> UpdateAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, UpdatePlanRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            // Validate library
            var libraryExists = await _context.Libraries.AnyAsync(x =>
                x.Id == libraryId &&
                x.BranchId == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

            if (!libraryExists)
                throw new InvalidOperationException("Library not found.");

            var plan = await _context.Plans.FirstOrDefaultAsync(x =>
                x.Id == planId &&
                x.LibraryId == libraryId,
                cancellationToken);

            if (plan == null)
                throw new InvalidOperationException("Plan not found.");

            if (PlanDefaults.IsDefaultPlanName(plan.Name) &&
                !string.Equals(plan.Name, request.Name.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Default plan name cannot be changed.");
            }

            // Duplicate plan name validation
            var duplicatePlan = await _context.Plans.AnyAsync(x =>
                x.LibraryId == libraryId &&
                x.Id != planId &&
                x.Name.ToLower() == request.Name.Trim().ToLower(),
                cancellationToken);

            if (duplicatePlan)
                throw new InvalidOperationException("A plan with the same name already exists in this library.");

            // Business validations
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new InvalidOperationException("Plan name is required.");

            if (request.Price <= 0)
                throw new InvalidOperationException("Price must be greater than zero.");

            if (request.DurationInDays <= 0)
                throw new InvalidOperationException("Duration must be greater than zero.");

            if (request.MaxSeats.HasValue && request.MaxSeats <= 0)
                throw new InvalidOperationException("Max seats must be greater than zero.");

            if (PlanDefaults.IsDefaultPlanName(plan.Name))
            {
                plan.Name = plan.Name.Trim();
            }
            else
            {
                plan.Name = request.Name.Trim();
            }

            plan.Description = request.Description?.Trim();
            plan.Price = request.Price;
            plan.DurationInDays = request.DurationInDays;
            plan.MaxSeats = request.MaxSeats;
            plan.IsActive = request.IsActive;
            plan.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return (await GetByIdAsync(
                institutionId,
                branchId,
                libraryId,
                planId,
                cancellationToken))!;
        }

        public async Task DeleteAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, string? userId, CancellationToken cancellationToken = default)
        {
            // Validate library
            var libraryExists = await _context.Libraries.AnyAsync(x =>
                x.Id == libraryId &&
                x.BranchId == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

            if (!libraryExists)
                throw new InvalidOperationException("Library not found.");

            var plan = await _context.Plans.FirstOrDefaultAsync(x =>
                x.Id == planId &&
                x.LibraryId == libraryId,
                cancellationToken);

            if (plan == null)
                throw new InvalidOperationException("Plan not found.");

            // Validation: Plan is assigned to members
            var isAssigned = await _context.MemberPlans.AnyAsync(x =>
                x.PlanId == planId,
                cancellationToken);

            if (isAssigned)
                throw new InvalidOperationException("This plan is assigned to one or more members and cannot be deleted.");

            _context.Plans.Remove(plan);

            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<PlanResponse> SetActiveStatusAsync(Guid institutionId, Guid branchId, Guid libraryId, Guid planId, bool isActive, string? userId, CancellationToken cancellationToken = default)
        {
            var libraryExists = await _context.Libraries.AnyAsync(x =>
                x.Id == libraryId &&
                x.BranchId == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

            if (!libraryExists)
                throw new InvalidOperationException("Library not found.");

            var plan = await _context.Plans.FirstOrDefaultAsync(x =>
                x.Id == planId &&
                x.LibraryId == libraryId,
                cancellationToken);

            if (plan == null)
                throw new InvalidOperationException("Plan not found.");

            if (plan.IsActive == isActive)
            {
                throw new InvalidOperationException(
                    isActive
                        ? "Plan is already active."
                        : "Plan is already inactive.");
            }

            plan.IsActive = isActive;
            plan.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return (await GetByIdAsync(
                institutionId,
                branchId,
                libraryId,
                planId,
                cancellationToken))!;
        }

        public async Task<IReadOnlyCollection<PlanResponse>> BulkCreateAsync(Guid institutionId, Guid branchId, Guid libraryId, IReadOnlyCollection<CreatePlanRequest> requests, string? userId, CancellationToken cancellationToken = default)
        {
            if (requests == null || !requests.Any())
                throw new InvalidOperationException("At least one plan is required.");

            var libraryExists = await _context.Libraries.AnyAsync(x =>
                x.Id == libraryId &&
                x.BranchId == branchId &&
                x.InstitutionId == institutionId,
                cancellationToken);

            if (!libraryExists)
                throw new InvalidOperationException("Library not found.");

            // Check duplicate names in request
            var duplicateRequestNames = requests
                .GroupBy(x => x.Name.Trim().ToLower())
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateRequestNames.Any())
                throw new InvalidOperationException("Duplicate plan names found in request.");

            // Existing plans in library
            var existingPlanNames = await _context.Plans
                .Where(x => x.LibraryId == libraryId)
                .Select(x => x.Name.ToLower())
                .ToListAsync(cancellationToken);

            var duplicateDbNames = requests
                .Where(x => existingPlanNames.Contains(x.Name.Trim().ToLower()))
                .Select(x => x.Name)
                .ToList();

            if (duplicateDbNames.Any())
                throw new InvalidOperationException(
                    $"Plan already exists: {string.Join(", ", duplicateDbNames)}");

            var plans = requests.Select(x => new Plan
            {
                Id = Guid.NewGuid(),
                InstitutionId = institutionId,
                BranchId = branchId,
                LibraryId = libraryId,
                Name = x.Name.Trim(),
                Description = x.Description?.Trim(),
                Price = x.Price,
                DurationInDays = x.DurationInDays,
                MaxSeats = x.MaxSeats,
                IsActive = x.IsActive,
                CreatedAtUtc = DateTime.UtcNow
            }).ToList();

            _context.Plans.AddRange(plans);

            await _context.SaveChangesAsync(cancellationToken);

            return await _context.Plans
                .Where(x => plans.Select(p => p.Id).Contains(x.Id))
                .Select(x => new PlanResponse
                {
                    Id = x.Id,
                    InstitutionId = x.InstitutionId,
                    BranchId = x.BranchId,
                    LibraryId = x.LibraryId,
                    Name = x.Name,
                    Description = x.Description,
                    Price = x.Price,
                    DurationInDays = x.DurationInDays,
                    MaxSeats = x.MaxSeats,
                    IsActive = x.IsActive,
                    CreatedAtUtc = x.CreatedAtUtc
                })
                .ToListAsync(cancellationToken);
        }
    }
}
