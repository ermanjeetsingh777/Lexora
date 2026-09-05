using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services
{
    public class PackageService : IPackageService
    {
        private readonly ApplicationDbContext _context;

        public PackageService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyCollection<PackageResponse>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Packages
                .Include(x => x.Features).AsNoTracking()
                .OrderBy(x => x.Price)
                .Select(x => MapToResponse(x))
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyCollection<PackageResponse>> GetActiveAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Packages
                .Include(x => x.Features)
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Price)
                .Select(x => MapToResponse(x))
                .ToListAsync(cancellationToken);
        }

        public async Task<PackageResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var package = await _context.Packages
                .Include(x => x.Features)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (package == null)
                return null;

            return MapToResponse(package);
        }

        public async Task<PackageResponse> CreateAsync(CreatePackageRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            var package = new Package
            {
                Name = request.Name,
                Code = string.IsNullOrWhiteSpace(request.Code) ? request.Name.Trim().Replace(" ", "_") : request.Code.Trim(),
                Category = string.IsNullOrWhiteSpace(request.Category) ? "Standard" : request.Category.Trim(),
                Price = request.Price,
                DurationInDays = request.DurationInDays > 0 ? request.DurationInDays : 365,
                Description = request.Description,
                IsActive = request.IsActive,
                IsPopular = request.IsPopular,
                CtaLabel = request.CtaLabel,
                MaxInstitutions = request.MaxInstitutions > 0 ? request.MaxInstitutions : 1,
                MaxBranches = request.MaxBranches > 0 ? request.MaxBranches : 1,
                MaxLibraries = request.MaxLibraries > 0 ? request.MaxLibraries : 1,
                MaxUsers = request.MaxUsers > 0 ? request.MaxUsers : 2,
                MaxMembers = request.MaxMembers > 0 ? request.MaxMembers : 200,
                CreatedAtUtc = DateTime.UtcNow
            };

            foreach (var feature in request.Features)
            {
                package.Features.Add(new PackageFeatures
                {
                    FeatureName = feature.FeatureName,
                    FeatureValue = feature.FeatureValue
                });
            }

            _context.Packages.Add(package);
            await _context.SaveChangesAsync(cancellationToken);

            return MapToResponse(package);
        }

        public async Task<PackageResponse> UpdateAsync(Guid id, UpdatePackageRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            var package = await _context.Packages
                .Include(x => x.Features)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (package == null)
                throw new KeyNotFoundException("Package not found.");

            package.Name = request.Name;
            if (!string.IsNullOrWhiteSpace(request.Code)) package.Code = request.Code.Trim();
            if (!string.IsNullOrWhiteSpace(request.Category)) package.Category = request.Category.Trim();
            package.Price = request.Price;
            package.DurationInDays = request.DurationInDays;
            package.Description = request.Description;
            package.IsActive = request.IsActive;
            package.IsPopular = request.IsPopular;
            package.CtaLabel = request.CtaLabel;
            package.MaxInstitutions = request.MaxInstitutions;
            package.MaxBranches = request.MaxBranches;
            package.MaxLibraries = request.MaxLibraries;
            package.MaxUsers = request.MaxUsers;
            package.MaxMembers = request.MaxMembers;
            package.UpdatedAtUtc = DateTime.UtcNow;

            _context.PackageFeatures.RemoveRange(package.Features);

            foreach (var feature in request.Features)
            {
                package.Features.Add(new PackageFeatures
                {
                    FeatureName = feature.FeatureName,
                    FeatureValue = feature.FeatureValue
                });
            }

            await _context.SaveChangesAsync(cancellationToken);
            return MapToResponse(package);
        }

        public async Task DeleteAsync(Guid id, string? userId, CancellationToken cancellationToken = default)
        {
            var package = await _context.Packages.FindAsync([id], cancellationToken);
            if (package == null)
                throw new KeyNotFoundException("Package not found.");

            _context.Packages.Remove(package);
            await _context.SaveChangesAsync(cancellationToken);
        }

        private static PackageResponse MapToResponse(Package package)
        {
            return new PackageResponse
            {
                Id = package.Id,
                Name = package.Name,
                Code = package.Code,
                Category = package.Category,
                Price = package.Price,
                DurationInDays = package.DurationInDays,
                Description = package.Description,
                IsActive = package.IsActive,
                IsPopular = package.IsPopular,
                CtaLabel = package.CtaLabel,
                MaxInstitutions = package.MaxInstitutions,
                MaxBranches = package.MaxBranches,
                MaxLibraries = package.MaxLibraries,
                MaxUsers = package.MaxUsers,
                MaxMembers = package.MaxMembers,
                Features = package.Features
                    .Select(f => new PackageFeatureResponse
                    {
                        Id = f.Id,
                        FeatureName = f.FeatureName,
                        FeatureValue = f.FeatureValue
                    }).ToList()
            };
        }
    }
}
