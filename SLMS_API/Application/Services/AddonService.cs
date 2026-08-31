using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Addon;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Constants;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services
{
    public class AddonService : IAddonService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public AddonService(ApplicationDbContext context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
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

            // Check if user is on a Trial plan
            var currentPackage = await _context.UserPackages
                .Include(x => x.Package)
                .FirstOrDefaultAsync(x => x.UserId == userId && x.IsCurrentPackage && x.IsActive, cancellationToken);

            if (currentPackage?.Package != null &&
                (string.Equals(currentPackage.Package.Code, PackageCodes.Trial, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(currentPackage.Package.Name, "Trial", StringComparison.OrdinalIgnoreCase) ||
                 currentPackage.Package.Price <= 0))
            {
                throw new InvalidOperationException("Add-ons cannot be added to a Free Trial. Please upgrade to Basic, Value, or Premium to purchase add-ons.");
            }

            var quantity = Math.Max(1, request.Quantity);
            var now = DateTime.UtcNow;

            var endDate = currentPackage != null && currentPackage.EndDateUtc > now
                ? currentPackage.EndDateUtc
                : now.AddDays(addon.DurationInDays);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

            var userAddon = new UserPackageAddon
            {
                UserId = userId,
                UserPackageId = currentPackage?.Id,
                AddonId = addon.Id,
                Quantity = quantity,
                TotalExtraQuantity = quantity * addon.UnitQuantity,
                AmountPaid = quantity * addon.Price,
                FinalApprovedAmount = quantity * addon.Price,
                StartDateUtc = now,
                EndDateUtc = endDate,
                PaymentStatus = "PendingApproval",
                ApprovalStatus = "Pending",
                AdminRemarks = !string.IsNullOrWhiteSpace(request.Note) ? request.Note : null,
                TransactionId = request.TransactionId ?? Guid.NewGuid().ToString("N")[..12].ToUpper(),
                PaymentMethod = request.PaymentMethod ?? "Online",
                IsActive = false, // Inactive until SuperAdmin approves!
                CreatedAtUtc = now
            };

            _context.UserPackageAddons.Add(userAddon);
            await _context.SaveChangesAsync(cancellationToken);

            var institution = await _context.UserInstitutions
                .Where(ui => ui.UserId == userId && ui.IsActive && !ui.Institution.IsDeleted)
                .Select(ui => ui.Institution.Name)
                .FirstOrDefaultAsync(cancellationToken);

            return new UserAddonResponse
            {
                Id = userAddon.Id,
                UserId = userId,
                UserFullName = user?.FullName ?? user?.UserName ?? "User",
                UserEmail = user?.Email,
                UserPhone = user?.PhoneNumber,
                InstitutionName = institution,
                AddonId = addon.Id,
                AddonName = addon.Name,
                AddonCode = addon.Code,
                ResourceType = addon.ResourceType,
                Quantity = userAddon.Quantity,
                UnitQuantity = addon.UnitQuantity,
                TotalExtraQuantity = userAddon.TotalExtraQuantity,
                AmountPaid = userAddon.AmountPaid,
                FinalApprovedAmount = userAddon.FinalApprovedAmount,
                StartDateUtc = userAddon.StartDateUtc,
                EndDateUtc = userAddon.EndDateUtc,
                PaymentStatus = userAddon.PaymentStatus,
                ApprovalStatus = userAddon.ApprovalStatus,
                AdminRemarks = userAddon.AdminRemarks,
                ApprovedAtUtc = userAddon.ApprovedAtUtc,
                RejectedAtUtc = userAddon.RejectedAtUtc,
                ApprovedBy = userAddon.ApprovedByUserId,
                IsActive = userAddon.IsActive,
                CreatedAtUtc = userAddon.CreatedAtUtc
            };
        }

        public async Task<IReadOnlyCollection<UserAddonResponse>> GetUserAddonsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            var institution = await _context.UserInstitutions
                .Where(ui => ui.UserId == userId && ui.IsActive && !ui.Institution.IsDeleted)
                .Select(ui => ui.Institution.Name)
                .FirstOrDefaultAsync(cancellationToken);

            return await _context.UserPackageAddons
                .Include(x => x.Addon)
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new UserAddonResponse
                {
                    Id = x.Id,
                    UserId = x.UserId,
                    UserFullName = user != null ? user.FullName : null,
                    UserEmail = user != null ? user.Email : null,
                    UserPhone = user != null ? user.PhoneNumber : null,
                    InstitutionName = institution,
                    AddonId = x.AddonId,
                    AddonName = x.Addon.Name,
                    AddonCode = x.Addon.Code,
                    ResourceType = x.Addon.ResourceType,
                    Quantity = x.Quantity,
                    UnitQuantity = x.Addon.UnitQuantity,
                    TotalExtraQuantity = x.TotalExtraQuantity,
                    AmountPaid = x.AmountPaid,
                    FinalApprovedAmount = x.FinalApprovedAmount,
                    StartDateUtc = x.StartDateUtc,
                    EndDateUtc = x.EndDateUtc,
                    PaymentStatus = x.PaymentStatus,
                    ApprovalStatus = x.ApprovalStatus ?? (x.IsActive ? "Approved" : "Pending"),
                    AdminRemarks = x.AdminRemarks,
                    ApprovedAtUtc = x.ApprovedAtUtc,
                    RejectedAtUtc = x.RejectedAtUtc,
                    ApprovedBy = x.ApprovedByUserId,
                    IsActive = x.IsActive,
                    CreatedAtUtc = x.CreatedAtUtc
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyCollection<UserAddonResponse>> GetAllAddonRequestsAsync(string? status, CancellationToken cancellationToken = default)
        {
            var query = _context.UserPackageAddons
                .Include(x => x.Addon)
                .Include(x => x.User)
                .Where(x => !(x.TransactionId != null && x.TransactionId.StartsWith("REG-") && x.User != null && x.User.ApprovalStatus == "Pending"))
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                var normalized = status.Trim().ToLowerInvariant();
                if (normalized == "pending")
                {
                    query = query.Where(x => x.ApprovalStatus == "Pending" || (!x.IsActive && x.ApprovalStatus != "Rejected"));
                }
                else if (normalized == "approved")
                {
                    query = query.Where(x => x.ApprovalStatus == "Approved" || x.IsActive);
                }
                else if (normalized == "rejected")
                {
                    query = query.Where(x => x.ApprovalStatus == "Rejected");
                }
            }

            var list = await query
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync(cancellationToken);

            var userIds = list.Select(x => x.UserId).Distinct().ToList();
            var institutions = await _context.UserInstitutions
                .Include(ui => ui.Institution)
                .Where(ui => userIds.Contains(ui.UserId) && ui.IsActive && !ui.Institution.IsDeleted)
                .ToListAsync(cancellationToken);

            return list.Select(x =>
            {
                var userInst = institutions.FirstOrDefault(i => i.UserId == x.UserId)?.Institution?.Name;
                return new UserAddonResponse
                {
                    Id = x.Id,
                    UserId = x.UserId,
                    UserFullName = x.User?.FullName ?? x.User?.UserName ?? "User",
                    UserEmail = x.User?.Email,
                    UserPhone = x.User?.PhoneNumber,
                    InstitutionName = userInst,
                    AddonId = x.AddonId,
                    AddonName = x.Addon?.Name ?? "Capacity Addon",
                    AddonCode = x.Addon?.Code ?? "",
                    ResourceType = x.Addon?.ResourceType ?? "",
                    Quantity = x.Quantity,
                    UnitQuantity = x.Addon?.UnitQuantity ?? 1,
                    TotalExtraQuantity = x.TotalExtraQuantity,
                    AmountPaid = x.AmountPaid,
                    FinalApprovedAmount = x.FinalApprovedAmount ?? x.AmountPaid,
                    StartDateUtc = x.StartDateUtc,
                    EndDateUtc = x.EndDateUtc,
                    PaymentStatus = x.PaymentStatus,
                    ApprovalStatus = x.ApprovalStatus ?? (x.IsActive ? "Approved" : "Pending"),
                    AdminRemarks = x.AdminRemarks,
                    ApprovedAtUtc = x.ApprovedAtUtc,
                    RejectedAtUtc = x.RejectedAtUtc,
                    ApprovedBy = x.ApprovedByUserId,
                    IsActive = x.IsActive,
                    CreatedAtUtc = x.CreatedAtUtc
                };
            }).ToList();
        }

        public async Task<UserAddonResponse> ApproveAddonRequestAsync(Guid id, ApproveAddonRequest request, string approverUserId, string? ipAddress, CancellationToken cancellationToken = default)
        {
            var userAddon = await _context.UserPackageAddons
                .Include(x => x.Addon)
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (userAddon == null)
                throw new KeyNotFoundException("Add-on purchase request not found.");

            userAddon.ApprovalStatus = "Approved";
            userAddon.IsActive = true;
            userAddon.PaymentStatus = "Paid";
            userAddon.ApprovedAtUtc = DateTime.UtcNow;
            userAddon.ApprovedByUserId = approverUserId;
            if (request.FinalAmount.HasValue)
            {
                userAddon.FinalApprovedAmount = request.FinalAmount.Value;
            }
            if (!string.IsNullOrWhiteSpace(request.Remarks))
            {
                userAddon.AdminRemarks = request.Remarks.Trim();
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.WriteAsync(
                AuditEventTypes.AddonApproval,
                userAddon.UserId,
                $"SuperAdmin approved Add-on request '{userAddon.Addon?.Name}' (+{userAddon.TotalExtraQuantity} {userAddon.Addon?.ResourceType}) for user '{userAddon.User?.Email}'. Remarks: {request.Remarks ?? "None"}",
                ipAddress,
                cancellationToken);

            var institution = await _context.UserInstitutions
                .Where(ui => ui.UserId == userAddon.UserId && ui.IsActive && !ui.Institution.IsDeleted)
                .Select(ui => ui.Institution.Name)
                .FirstOrDefaultAsync(cancellationToken);

            return new UserAddonResponse
            {
                Id = userAddon.Id,
                UserId = userAddon.UserId,
                UserFullName = userAddon.User?.FullName,
                UserEmail = userAddon.User?.Email,
                UserPhone = userAddon.User?.PhoneNumber,
                InstitutionName = institution,
                AddonId = userAddon.AddonId,
                AddonName = userAddon.Addon?.Name ?? "",
                AddonCode = userAddon.Addon?.Code ?? "",
                ResourceType = userAddon.Addon?.ResourceType ?? "",
                Quantity = userAddon.Quantity,
                UnitQuantity = userAddon.Addon?.UnitQuantity ?? 1,
                TotalExtraQuantity = userAddon.TotalExtraQuantity,
                AmountPaid = userAddon.AmountPaid,
                FinalApprovedAmount = userAddon.FinalApprovedAmount,
                StartDateUtc = userAddon.StartDateUtc,
                EndDateUtc = userAddon.EndDateUtc,
                PaymentStatus = userAddon.PaymentStatus,
                ApprovalStatus = userAddon.ApprovalStatus,
                AdminRemarks = userAddon.AdminRemarks,
                ApprovedAtUtc = userAddon.ApprovedAtUtc,
                RejectedAtUtc = userAddon.RejectedAtUtc,
                ApprovedBy = userAddon.ApprovedByUserId,
                IsActive = userAddon.IsActive,
                CreatedAtUtc = userAddon.CreatedAtUtc
            };
        }

        public async Task<UserAddonResponse> RejectAddonRequestAsync(Guid id, RejectAddonRequest request, string approverUserId, string? ipAddress, CancellationToken cancellationToken = default)
        {
            var userAddon = await _context.UserPackageAddons
                .Include(x => x.Addon)
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (userAddon == null)
                throw new KeyNotFoundException("Add-on purchase request not found.");

            userAddon.ApprovalStatus = "Rejected";
            userAddon.IsActive = false;
            userAddon.RejectedAtUtc = DateTime.UtcNow;
            userAddon.ApprovedByUserId = approverUserId;
            userAddon.AdminRemarks = request.Reason?.Trim();

            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.WriteAsync(
                AuditEventTypes.AddonApproval,
                userAddon.UserId,
                $"SuperAdmin rejected Add-on request '{userAddon.Addon?.Name}' for user '{userAddon.User?.Email}'. Reason: {request.Reason}",
                ipAddress,
                cancellationToken);

            var institution = await _context.UserInstitutions
                .Where(ui => ui.UserId == userAddon.UserId && ui.IsActive && !ui.Institution.IsDeleted)
                .Select(ui => ui.Institution.Name)
                .FirstOrDefaultAsync(cancellationToken);

            return new UserAddonResponse
            {
                Id = userAddon.Id,
                UserId = userAddon.UserId,
                UserFullName = userAddon.User?.FullName,
                UserEmail = userAddon.User?.Email,
                UserPhone = userAddon.User?.PhoneNumber,
                InstitutionName = institution,
                AddonId = userAddon.AddonId,
                AddonName = userAddon.Addon?.Name ?? "",
                AddonCode = userAddon.Addon?.Code ?? "",
                ResourceType = userAddon.Addon?.ResourceType ?? "",
                Quantity = userAddon.Quantity,
                UnitQuantity = userAddon.Addon?.UnitQuantity ?? 1,
                TotalExtraQuantity = userAddon.TotalExtraQuantity,
                AmountPaid = userAddon.AmountPaid,
                FinalApprovedAmount = userAddon.FinalApprovedAmount,
                StartDateUtc = userAddon.StartDateUtc,
                EndDateUtc = userAddon.EndDateUtc,
                PaymentStatus = userAddon.PaymentStatus,
                ApprovalStatus = userAddon.ApprovalStatus,
                AdminRemarks = userAddon.AdminRemarks,
                ApprovedAtUtc = userAddon.ApprovedAtUtc,
                RejectedAtUtc = userAddon.RejectedAtUtc,
                ApprovedBy = userAddon.ApprovedByUserId,
                IsActive = userAddon.IsActive,
                CreatedAtUtc = userAddon.CreatedAtUtc
            };
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
