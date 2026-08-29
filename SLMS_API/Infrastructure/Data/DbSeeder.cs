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

            var expectedPermissionIds = permissions.Select(p => (int)p).ToHashSet();
            var existingRolePermissions = await dbContext.RolePermissions
                .Where(x => x.RoleId == role.Id)
                .ToListAsync(cancellationToken: default);

            foreach (var stale in existingRolePermissions.Where(x => !expectedPermissionIds.Contains(x.PermissionId)))
            {
                dbContext.RolePermissions.Remove(stale);
            }

            var existingPermissionIds = existingRolePermissions
                .Select(x => x.PermissionId)
                .ToHashSet();

            foreach (var permissionId in expectedPermissionIds.Where(id => !existingPermissionIds.Contains(id)))
            {
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
        await SuperAdminSeedData.SeedAsync(serviceProvider);
        await DemoSeedData.SeedAsync(serviceProvider);
        await SeedSupportArticlesAsync(serviceProvider);
        await SeedBooksAsync(serviceProvider);
        await SeedPackagesAndAddonsAsync(serviceProvider);
    }

    public static async Task SeedPackagesAndAddonsAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var packages = new List<Package>
        {
            new Package
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Name = "Trial",
                Code = PackageCodes.Trial,
                Category = "Starter",
                Price = 0.00m,
                Description = "14-day full feature trial to experience smart library management.",
                IsPopular = false,
                CtaLabel = "Start Free Trial",
                DurationInDays = 14,
                IsActive = true,
                MaxInstitutions = 1,
                MaxBranches = 1,
                MaxLibraries = 1,
                MaxUsers = 2,
                MaxMembers = 50
            },
            new Package
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Name = "Basic",
                Code = PackageCodes.Basic,
                Category = "Starter",
                Price = 2499.00m,
                Description = "Perfect for independent libraries (1 institution, 1 branch, 1 library, 2 users, up to 200 active members).",
                IsPopular = false,
                CtaLabel = "Select Basic",
                DurationInDays = 365,
                IsActive = true,
                MaxInstitutions = 1,
                MaxBranches = 1,
                MaxLibraries = 1,
                MaxUsers = 2,
                MaxMembers = 200
            },
            new Package
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Name = "Value",
                Code = PackageCodes.Value,
                Category = "Professional",
                Price = 4999.00m,
                Description = "Ideal for growing organizations (2 institutions, 2 branches, 2 libraries, 4 users, up to 400 active members).",
                IsPopular = true,
                CtaLabel = "Select Value",
                DurationInDays = 365,
                IsActive = true,
                MaxInstitutions = 2,
                MaxBranches = 2,
                MaxLibraries = 2,
                MaxUsers = 4,
                MaxMembers = 400
            },
            new Package
            {
                Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                Name = "Premium",
                Code = PackageCodes.Premium,
                Category = "Enterprise",
                Price = 8299.00m,
                Description = "Full-scale enterprise solution (5 institutions, 5 branches, 5 libraries, 10 users, up to 1000 active members).",
                IsPopular = false,
                CtaLabel = "Select Premium",
                DurationInDays = 365,
                IsActive = true,
                MaxInstitutions = 5,
                MaxBranches = 5,
                MaxLibraries = 5,
                MaxUsers = 10,
                MaxMembers = 1000
            }
        };

        foreach (var p in packages)
        {
            var existing = await dbContext.Packages.FirstOrDefaultAsync(x => x.Id == p.Id || x.Code == p.Code);
            if (existing is null)
            {
                dbContext.Packages.Add(p);
            }
            else
            {
                existing.MaxInstitutions = p.MaxInstitutions;
                existing.MaxBranches = p.MaxBranches;
                existing.MaxLibraries = p.MaxLibraries;
                existing.MaxUsers = p.MaxUsers;
                existing.MaxMembers = p.MaxMembers;
            }
        }

        var addons = new List<Addon>
        {
            new Addon
            {
                Id = Guid.Parse("a1111111-1111-1111-1111-111111111111"),
                Name = "Additional Library",
                Code = "ADDON_LIBRARY",
                ResourceType = "Library",
                UnitQuantity = 1,
                Price = 999.00m,
                DurationInDays = 365,
                Description = "Add 1 additional library with real-time occupancy and attendance management.",
                IsActive = true
            },
            new Addon
            {
                Id = Guid.Parse("a2222222-2222-2222-2222-222222222222"),
                Name = "100 Active Members Pack",
                Code = "ADDON_MEMBERS_100",
                ResourceType = "Member",
                UnitQuantity = 100,
                Price = 499.00m,
                DurationInDays = 365,
                Description = "Increase active member capacity by 100 active members.",
                IsActive = true
            },
            new Addon
            {
                Id = Guid.Parse("a3333333-3333-3333-3333-333333333333"),
                Name = "200 Active Members Pack",
                Code = "ADDON_MEMBERS_200",
                ResourceType = "Member",
                UnitQuantity = 200,
                Price = 899.00m,
                DurationInDays = 365,
                Description = "Increase active member capacity by 200 active members.",
                IsActive = true
            },
            new Addon
            {
                Id = Guid.Parse("a4444444-4444-4444-4444-444444444444"),
                Name = "Additional Staff User",
                Code = "ADDON_USER",
                ResourceType = "User",
                UnitQuantity = 1,
                Price = 399.00m,
                DurationInDays = 365,
                Description = "Add 1 extra staff/operator login with granular permissions.",
                IsActive = true
            },
            new Addon
            {
                Id = Guid.Parse("a5555555-5555-5555-5555-555555555555"),
                Name = "Additional Branch",
                Code = "ADDON_BRANCH",
                ResourceType = "Branch",
                UnitQuantity = 1,
                Price = 799.00m,
                DurationInDays = 365,
                Description = "Add 1 additional branch location under your institution.",
                IsActive = true
            },
            new Addon
            {
                Id = Guid.Parse("a6666666-6666-6666-6666-666666666666"),
                Name = "Additional Institution",
                Code = "ADDON_INSTITUTION",
                ResourceType = "Institution",
                UnitQuantity = 1,
                Price = 1499.00m,
                DurationInDays = 365,
                Description = "Add 1 additional institution to manage separate organizations.",
                IsActive = true
            }
        };

        foreach (var a in addons)
        {
            var existing = await dbContext.Addons.FirstOrDefaultAsync(x => x.Id == a.Id || x.Code == a.Code);
            if (existing is null)
            {
                dbContext.Addons.Add(a);
            }
        }

        await dbContext.SaveChangesAsync();
    }

    public static async Task SeedBooksAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await BooksSeedData.SeedAsync(dbContext);
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
