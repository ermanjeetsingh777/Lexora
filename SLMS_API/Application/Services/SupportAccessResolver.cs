using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Support.Responses;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public sealed class SupportAccessContext
{
    public string UserId { get; init; } = string.Empty;
    public bool IsSuperAdmin { get; init; }
    public bool IsOrgStaff { get; init; }
    public IReadOnlyList<string> Roles { get; init; } = Array.Empty<string>();
    public IReadOnlyList<Guid> InstitutionIds { get; init; } = Array.Empty<Guid>();
}

public interface ISupportAccessResolver
{
    Task<SupportAccessContext> ResolveAsync(string userId, CancellationToken cancellationToken = default);
    Task<SupportContextResponse> BuildContextResponseAsync(string userId, CancellationToken cancellationToken = default);
    bool CanViewTicket(SupportAccessContext access, SupportTicket ticket);
    bool CanReply(SupportAccessContext access, SupportTicket ticket);
    bool CanChangeStatus(SupportAccessContext access, SupportTicket ticket);
    bool CanCreateOnBehalf(SupportAccessContext access);
    IReadOnlyCollection<TicketCategory> GetCreatableCategories(SupportAccessContext access);
    string ResolveAuthorRole(SupportAccessContext access);
}

public class SupportAccessResolver : ISupportAccessResolver
{
    private static readonly HashSet<string> StaffRoles =
    [
        RoleDefinitions.OrganisationAdmin,
        RoleDefinitions.OrganisationManager,
        RoleDefinitions.InstitutionAdmin,
        RoleDefinitions.InstitutionManager,
        RoleDefinitions.BranchAdmin,
        RoleDefinitions.BranchManager,
        RoleDefinitions.LibrarianAdmin,
        RoleDefinitions.LibrarianManager,
        RoleDefinitions.SuperAdmin,
    ];

    private static readonly HashSet<TicketCategory> SuperAdminOnlyStatusCategories =
    [
        TicketCategory.Bug,
        TicketCategory.FeatureRequest,
        TicketCategory.Technical,
    ];

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public SupportAccessResolver(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    public async Task<SupportAccessContext> ResolveAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        var roles = await _userManager.GetRolesAsync(user);
        var isSuperAdmin = roles.Contains(RoleDefinitions.SuperAdmin, StringComparer.OrdinalIgnoreCase);
        var isOrgStaff = roles.Any(r => StaffRoles.Contains(r, StringComparer.OrdinalIgnoreCase));

        var institutionIds = isSuperAdmin
            ? await _db.Institutions.AsNoTracking().Where(i => !i.IsDeleted).Select(i => i.Id).ToListAsync(cancellationToken)
            : await GetCallerInstitutionIdsAsync(userId, cancellationToken);

        return new SupportAccessContext
        {
            UserId = userId,
            IsSuperAdmin = isSuperAdmin,
            IsOrgStaff = isOrgStaff,
            Roles = roles.ToArray(),
            InstitutionIds = institutionIds,
        };
    }

    public async Task<SupportContextResponse> BuildContextResponseAsync(string userId, CancellationToken cancellationToken = default)
    {
        var access = await ResolveAsync(userId, cancellationToken);
        var institutions = access.InstitutionIds.Count == 0
            ? new List<SupportInstitutionOptionResponse>()
            : await _db.Institutions.AsNoTracking()
                .Where(i => !i.IsDeleted && access.InstitutionIds.Contains(i.Id))
                .OrderBy(i => i.Name)
                .Select(i => new SupportInstitutionOptionResponse { Id = i.Id, Name = i.Name })
                .ToListAsync(cancellationToken);

        var scopeLabel = access.IsSuperAdmin
            ? "All institutions"
            : institutions.Count switch
            {
                0 => "No institution access",
                1 => institutions[0].Name,
                _ => $"{institutions.Count} institutions",
            };

        return new SupportContextResponse
        {
            IsSuperAdmin = access.IsSuperAdmin,
            IsOrgStaff = access.IsOrgStaff,
            ScopeLabel = scopeLabel,
            Institutions = institutions,
            CreatableCategories = GetCreatableCategories(access).ToArray(),
        };
    }

    public bool CanViewTicket(SupportAccessContext access, SupportTicket ticket)
    {
        if (access.IsSuperAdmin)
        {
            return true;
        }

        if (ticket.RequesterUserId == access.UserId || ticket.CreatedByUserId == access.UserId)
        {
            return true;
        }

        return ticket.InstitutionId.HasValue && access.InstitutionIds.Contains(ticket.InstitutionId.Value);
    }

    public bool CanReply(SupportAccessContext access, SupportTicket ticket) => CanViewTicket(access, ticket);

    public bool CanChangeStatus(SupportAccessContext access, SupportTicket ticket)
    {
        if (SuperAdminOnlyStatusCategories.Contains(ticket.Category))
        {
            return access.IsSuperAdmin;
        }

        return access.IsSuperAdmin || access.IsOrgStaff;
    }

    public bool CanCreateOnBehalf(SupportAccessContext access) =>
        access.IsSuperAdmin || access.IsOrgStaff;

    public IReadOnlyCollection<TicketCategory> GetCreatableCategories(SupportAccessContext access)
    {
        if (access.IsSuperAdmin || access.IsOrgStaff)
        {
            return Enum.GetValues<TicketCategory>();
        }

        return
        [
            TicketCategory.AttendanceCorrection,
            TicketCategory.Account,
            TicketCategory.Billing,
            TicketCategory.FeatureRequest,
            TicketCategory.Bug,
            TicketCategory.Other,
        ];
    }

    public string ResolveAuthorRole(SupportAccessContext access)
    {
        if (access.IsSuperAdmin)
        {
            return "Support";
        }

        return access.IsOrgStaff ? "Admin" : "Member";
    }

    private async Task<List<Guid>> GetCallerInstitutionIdsAsync(string callerUserId, CancellationToken cancellationToken)
    {
        var institutionIds = await _db.UserInstitutions
            .AsNoTracking()
            .Where(ui => ui.UserId == callerUserId && ui.IsActive)
            .Select(ui => ui.InstitutionId)
            .ToListAsync(cancellationToken);

        var branchInstitutionIds = await _db.UserBranches
            .AsNoTracking()
            .Where(ub => ub.UserId == callerUserId && ub.IsActive)
            .Select(ub => ub.InstitutionId)
            .ToListAsync(cancellationToken);

        var libraryInstitutionIds = await _db.UserLibraries
            .AsNoTracking()
            .Where(ul => ul.UserId == callerUserId && ul.IsActive)
            .Select(ul => ul.InstitutionId)
            .ToListAsync(cancellationToken);

        return institutionIds
            .Concat(branchInstitutionIds)
            .Concat(libraryInstitutionIds)
            .Distinct()
            .ToList();
    }
}
