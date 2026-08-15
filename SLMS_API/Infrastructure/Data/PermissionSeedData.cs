using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Authorization;

namespace SLMS_API.Infrastructure.Data;

public static class PermissionSeedData
{
    public static Permission[] GetAll() =>
        Enum.GetValues<PermissionKey>()
            .Select(key => Create(key, FormatName(key)))
            .ToArray();

    private static string FormatName(PermissionKey key)
    {
        var claim = key.ToClaimValue();
        return string.Join(' ', claim.Split('.').Select(part =>
            part.Length == 0 ? part : char.ToUpperInvariant(part[0]) + part[1..]));
    }

    private static Permission Create(PermissionKey key, string name) =>
        new()
        {
            Id = (int)key,
            Code = key.ToClaimValue(),
            Name = name
        };
}
