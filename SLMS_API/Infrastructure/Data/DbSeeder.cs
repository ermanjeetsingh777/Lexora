using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SLMS_API.Common.Constants;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedRolesAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        foreach (var role in RoleDefinitions.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }
    }

    public static async Task SeedRolePermissionsAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var defaultMap = RolePermissionDefinitions.GetDefaultRolePermissionMap();
        var roles = await dbContext.Roles.AsNoTracking().ToListAsync();
        var roleLookup = roles
            .Where(x => !string.IsNullOrWhiteSpace(x.Name))
            .ToDictionary(x => x.Name!, StringComparer.OrdinalIgnoreCase);

        foreach (var (roleName, permissions) in defaultMap)
        {
            if (!roleLookup.TryGetValue(roleName, out var role))
            {
                continue;
            }

            var existingPermissionIds = await dbContext.RolePermissions
                .Where(x => x.RoleId == role.Id)
                .Select(x => x.PermissionId)
                .ToListAsync();

            foreach (var permission in permissions.Distinct())
            {
                var permissionId = (int)permission;
                if (existingPermissionIds.Contains(permissionId))
                {
                    continue;
                }

                dbContext.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = permissionId
                });
            }
        }

        await dbContext.SaveChangesAsync();
    }

    public static async Task MigrateAndSeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.MigrateAsync();
        await SeedRolesAsync(serviceProvider);
        await SeedRolePermissionsAsync(serviceProvider);
        await SeedSupportArticlesAsync(serviceProvider);
    }

    public static async Task SeedSupportArticlesAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        if (await dbContext.KnowledgeBaseArticles.AnyAsync())
        {
            return;
        }

        dbContext.KnowledgeBaseArticles.AddRange(SupportSeedData.GetArticles());
        await dbContext.SaveChangesAsync();
    }
}
