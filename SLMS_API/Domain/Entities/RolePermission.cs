using Microsoft.AspNetCore.Identity;

namespace SLMS_API.Domain.Entities;

public class RolePermission
{
    public long Id { get; set; }
    public string RoleId { get; set; } = string.Empty;
    public int PermissionId { get; set; }

    public IdentityRole? Role { get; set; }
    public Permission? Permission { get; set; }
}
