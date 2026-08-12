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
                .Select(x => new PackageResponse
                {
                    Id = x.Id,
                    Name = x.Name,
                    Price = x.Price,
                    DurationInDays = x.DurationInDays,
                    Description = x.Description,
                    IsActive = x.IsActive,
                    Features = x.Features
                        .Select(f => new PackageFeatureResponse
                        {
                            Id = f.Id,
                            FeatureName = f.FeatureName,
                            FeatureValue = f.FeatureValue
                        }).ToList()
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<PackageResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var package = await _context.Packages
                .Include(x => x.Features).
                AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (package == null)
                return null;

            return new PackageResponse
            {
                Id = package.Id,
                Name = package.Name,
                Price = package.Price,
                DurationInDays = package.DurationInDays,
                Description = package.Description,
                IsActive = package.IsActive,
                Features = package.Features
                    .Select(f => new PackageFeatureResponse
                    {
                        Id = f.Id,
                        FeatureName = f.FeatureName,
                        FeatureValue = f.FeatureValue
                    }).ToList()
            };
        }

        public async Task<PackageResponse> CreateAsync(CreatePackageRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            var package = new Package
            {
                Name = request.Name,
                Price = request.Price,
                DurationInDays = request.DurationInDays,
                Description = request.Description,
                IsActive = true
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

            return new PackageResponse
            {
                Id = package.Id,
                Name = package.Name,
                Price = package.Price,
                DurationInDays = package.DurationInDays,
                Description = package.Description,
                IsActive = package.IsActive,
                Features = package.Features
                     .Select(f => new PackageFeatureResponse
                     {
                         Id = f.Id,
                         FeatureName = f.FeatureName,
                         FeatureValue = f.FeatureValue
                     }).ToList()
            };
        }

        public async Task<PackageResponse> UpdateAsync(Guid id, UpdatePackageRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            var package = await _context.Packages
                .Include(x => x.Features)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (package == null)
                throw new KeyNotFoundException("Package not found.");

            package.Name = request.Name;
            package.Price = request.Price;
            package.DurationInDays = request.DurationInDays;
            package.Description = request.Description;
            package.IsActive = request.IsActive;

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
            return new PackageResponse
            {
                Id = package.Id,
                Name = package.Name,
                Price = package.Price,
                DurationInDays = package.DurationInDays,
                Description = package.Description,
                IsActive = package.IsActive,
                Features = package.Features
                    .Select(f => new PackageFeatureResponse
                    {
                        Id = f.Id,
                        FeatureName = f.FeatureName,
                        FeatureValue = f.FeatureValue
                    }).ToList()
            };
        }

        public async Task DeleteAsync(Guid packageId, string? userId, CancellationToken cancellationToken = default)
        {
            var package = await _context.Packages.FindAsync([packageId], cancellationToken);

            if (package == null)
                throw new KeyNotFoundException("Package not found.");

            _context.Packages.Remove(package);

            await _context.SaveChangesAsync(cancellationToken);
        }

    }
}
