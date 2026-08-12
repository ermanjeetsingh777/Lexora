using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Common.Enums;
using SLMS_API.Infrastructure.Data;

namespace SLMS_API.Application.Services;

public class PermissionResolver : IPermissionResolver
{
    private readonly ApplicationDbContext _dbContext;

    public PermissionResolver(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyCollection<PermissionKey>> GetPermissionsForRolesAsync(
        IEnumerable<string> roles,
        CancellationToken cancellationToken = default)
    {
        var roleNames = roles
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (roleNames.Length == 0)
        {
            return [];
        }

        var permissionIds = await (
            from rolePermission in _dbContext.RolePermissions
            join role in _dbContext.Roles on rolePermission.RoleId equals role.Id
            where role.Name != null && roleNames.Contains(role.Name)
            select rolePermission.PermissionId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return permissionIds
            .Where(id => Enum.IsDefined(typeof(PermissionKey), id))
            .Select(id => (PermissionKey)id)
            .ToArray();
    }
}
