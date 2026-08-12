using SLMS_API.Common.Enums;

namespace SLMS_API.Application.Services.Interfaces;

public interface IPermissionResolver
{
    Task<IReadOnlyCollection<PermissionKey>> GetPermissionsForRolesAsync(
        IEnumerable<string> roles,
        CancellationToken cancellationToken = default);
}
