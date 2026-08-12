using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Package.Request;
using SLMS_API.Application.Contracts.Package.Response;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services
{
    public class UserPackageService : IUserPackageService
    {
        private readonly ApplicationDbContext _context;

        public UserPackageService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<UserPackageResponse?> GetCurrentPackageAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var userPackage = await _context.UserPackages
                .Include(x => x.Package)
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.UserId == userId &&
                    x.IsCurrentPackage,
                    cancellationToken);

            if (userPackage == null)
                return null;

            return Map(userPackage);
        }

        public async Task<IReadOnlyCollection<UserPackageResponse>> GetHistoryAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            return await _context.UserPackages
                .Include(x => x.Package)
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new UserPackageResponse
                {
                    Id = x.Id,
                    UserId = x.UserId,
                    PackageId = x.PackageId,
                    PackageName = x.Package.Name,
                    Price = x.AmountPaid,
                    StartDateUtc = x.StartDateUtc,
                    EndDateUtc = x.EndDateUtc,
                    AutoRenew = x.AutoRenew,
                    IsCurrentPackage = x.IsCurrentPackage,
                    PaymentStatus = x.PaymentStatus
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<UserPackageResponse> SubscribeAsync(
            string userId,
            SubscribePackageRequest request,
            CancellationToken cancellationToken = default)
        {
            var package = await _context.Packages
                .FirstOrDefaultAsync(x => x.Id == request.PackageId && x.IsActive, cancellationToken)
                ?? throw new InvalidOperationException("Package not found.");
           
            var userPackage = new UserPackage
            {
                UserId = userId,
                PackageId = package.Id,
                StartDateUtc = DateTime.UtcNow,
                EndDateUtc = DateTime.UtcNow.AddDays(package.DurationInDays),

                AmountPaid = package.Price,
                AdjustmentAmount = 0,

                AutoRenew = request.AutoRenew,
                IsActive = true,
                IsCurrentPackage = true,

                PaymentStatus = "Paid",
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.UserPackages.Add(userPackage);
            await _context.SaveChangesAsync(cancellationToken);

            userPackage.Package = package;

            return Map(userPackage);
        }

        public async Task<UserPackageResponse> UpgradeAsync(
            string userId,
            UpgradePackageRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentPackage = await _context.UserPackages
                .FirstOrDefaultAsync(x =>
                    x.UserId == userId &&
                    x.IsCurrentPackage,
                    cancellationToken)
                ?? throw new InvalidOperationException("Active package not found.");

            currentPackage.IsCurrentPackage = false;

            var newPackage = await _context.Packages
                .FirstOrDefaultAsync(x => x.Id == request.NewPackageId && x.IsActive, cancellationToken)
                ?? throw new InvalidOperationException("Package not found.");

            var upgradedPackage = new UserPackage
            {
                UserId = userId,
                PackageId = newPackage.Id,
                StartDateUtc = DateTime.UtcNow,
                EndDateUtc = DateTime.UtcNow.AddDays(newPackage.DurationInDays),
                AutoRenew = request.AutoRenew,
                AmountPaid = newPackage.Price,
                PaymentStatus = "Paid",
                IsCurrentPackage = true
            };

            _context.UserPackages.Add(upgradedPackage);

            await _context.SaveChangesAsync(cancellationToken);

            upgradedPackage.Package = newPackage;

            return Map(upgradedPackage);
        }

        public async Task CancelAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var currentPackage = await _context.UserPackages
                .FirstOrDefaultAsync(x =>
                    x.UserId == userId &&
                    x.IsCurrentPackage,
                    cancellationToken)
                ?? throw new InvalidOperationException("No active subscription found.");

            currentPackage.IsCurrentPackage = false;

            await _context.SaveChangesAsync(cancellationToken);
        }

        private static UserPackageResponse Map(UserPackage userPackage)
        {
            return new UserPackageResponse
            {
                Id = userPackage.Id,
                UserId = userPackage.UserId,
                PackageId = userPackage.PackageId,
                PackageName = userPackage.Package.Name,
                Price = userPackage.AmountPaid,
                StartDateUtc = userPackage.StartDateUtc,
                EndDateUtc = userPackage.EndDateUtc,
                AutoRenew = userPackage.AutoRenew,
                IsCurrentPackage = userPackage.IsCurrentPackage,
                PaymentStatus = userPackage.PaymentStatus
            };
        }
    }
}
