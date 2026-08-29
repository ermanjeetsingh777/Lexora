using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Addon;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services
{
    public class AddonService : IAddonService
    {
        private readonly ApplicationDbContext _context;

        public AddonService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyCollection<AddonResponse>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Addons
                .AsNoTracking()
                .OrderBy(x => x.Price)
                .Select(x => MapToResponse(x))
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyCollection<AddonResponse>> GetActiveAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Addons
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Price)
                .Select(x => MapToResponse(x))
                .ToListAsync(cancellationToken);
        }

        public async Task<AddonResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var addon = await _context.Addons
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            return addon == null ? null : MapToResponse(addon);
        }

        public async Task<AddonResponse> CreateAsync(CreateAddonRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            var addon = new Addon
            {
                Name = request.Name,
                Code = string.IsNullOrWhiteSpace(request.Code) ? "ADDON_" + request.Name.Trim().ToUpper().Replace(" ", "_") : request.Code.Trim().ToUpper(),
                ResourceType = request.ResourceType,
                UnitQuantity = request.UnitQuantity > 0 ? request.UnitQuantity : 1,
                Price = request.Price,
                DurationInDays = request.DurationInDays > 0 ? request.DurationInDays : 365,
                Description = request.Description,
                IsActive = request.IsActive,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.Addons.Add(addon);
            await _context.SaveChangesAsync(cancellationToken);

            return MapToResponse(addon);
        }

        public async Task<AddonResponse> UpdateAsync(Guid id, UpdateAddonRequest request, string? userId, CancellationToken cancellationToken = default)
        {
            var addon = await _context.Addons.FindAsync([id], cancellationToken);
            if (addon == null)
                throw new KeyNotFoundException("Addon not found.");

            addon.Name = request.Name;
            if (!string.IsNullOrWhiteSpace(request.Code)) addon.Code = request.Code.Trim().ToUpper();
            addon.ResourceType = request.ResourceType;
            addon.UnitQuantity = request.UnitQuantity > 0 ? request.UnitQuantity : 1;
            addon.Price = request.Price;
            addon.DurationInDays = request.DurationInDays > 0 ? request.DurationInDays : 365;
            addon.Description = request.Description;
            addon.IsActive = request.IsActive;
            addon.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return MapToResponse(addon);
        }

        public async Task DeleteAsync(Guid id, string? userId, CancellationToken cancellationToken = default)
        {
            var addon = await _context.Addons.FindAsync([id], cancellationToken);
            if (addon == null)
                throw new KeyNotFoundException("Addon not found.");

            _context.Addons.Remove(addon);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<UserAddonResponse> PurchaseAddonAsync(PurchaseAddonRequest request, string userId, CancellationToken cancellationToken = default)
        {
            var addon = await _context.Addons.FindAsync([request.AddonId], cancellationToken);
            if (addon == null || !addon.IsActive)
                throw new InvalidOperationException("Addon is not available for purchase.");

            var quantity = Math.Max(1, request.Quantity);
            var now = DateTime.UtcNow;

            // Find current active user package if any
            var currentPackage = await _context.UserPackages
                .FirstOrDefaultAsync(x => x.UserId == userId && x.IsCurrentPackage && x.IsActive, cancellationToken);

            var endDate = currentPackage != null && currentPackage.EndDateUtc > now
                ? currentPackage.EndDateUtc
                : now.AddDays(addon.DurationInDays);

            var userAddon = new UserPackageAddon
            {
                UserId = userId,
                UserPackageId = currentPackage?.Id,
                AddonId = addon.Id,
                Quantity = quantity,
                TotalExtraQuantity = quantity * addon.UnitQuantity,
                AmountPaid = quantity * addon.Price,
                StartDateUtc = now,
                EndDateUtc = endDate,
                PaymentStatus = "Paid",
                TransactionId = request.TransactionId ?? Guid.NewGuid().ToString("N")[..12].ToUpper(),
                PaymentMethod = request.PaymentMethod ?? "Online",
                IsActive = true,
                CreatedAtUtc = now
            };

            _context.UserPackageAddons.Add(userAddon);
            await _context.SaveChangesAsync(cancellationToken);

            return new UserAddonResponse
            {
                Id = userAddon.Id,
                AddonId = addon.Id,
                AddonName = addon.Name,
                AddonCode = addon.Code,
                ResourceType = addon.ResourceType,
                Quantity = userAddon.Quantity,
                TotalExtraQuantity = userAddon.TotalExtraQuantity,
                AmountPaid = userAddon.AmountPaid,
                StartDateUtc = userAddon.StartDateUtc,
                EndDateUtc = userAddon.EndDateUtc,
                PaymentStatus = userAddon.PaymentStatus,
                IsActive = userAddon.IsActive
            };
        }

        public async Task<IReadOnlyCollection<UserAddonResponse>> GetUserAddonsAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await _context.UserPackageAddons
                .Include(x => x.Addon)
                .AsNoTracking()
                .Where(x => x.UserId == userId && x.IsActive && x.EndDateUtc > DateTime.UtcNow)
                .Select(x => new UserAddonResponse
                {
                    Id = x.Id,
                    AddonId = x.AddonId,
                    AddonName = x.Addon.Name,
                    AddonCode = x.Addon.Code,
                    ResourceType = x.Addon.ResourceType,
                    Quantity = x.Quantity,
                    TotalExtraQuantity = x.TotalExtraQuantity,
                    AmountPaid = x.AmountPaid,
                    StartDateUtc = x.StartDateUtc,
                    EndDateUtc = x.EndDateUtc,
                    PaymentStatus = x.PaymentStatus,
                    IsActive = x.IsActive
                })
                .ToListAsync(cancellationToken);
        }

        private static AddonResponse MapToResponse(Addon addon)
        {
            return new AddonResponse
            {
                Id = addon.Id,
                Name = addon.Name,
                Code = addon.Code,
                ResourceType = addon.ResourceType,
                UnitQuantity = addon.UnitQuantity,
                Price = addon.Price,
                DurationInDays = addon.DurationInDays,
                Description = addon.Description,
                IsActive = addon.IsActive
            };
        }
    }
}
