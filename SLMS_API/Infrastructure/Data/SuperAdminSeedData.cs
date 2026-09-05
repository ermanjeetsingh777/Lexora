using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SLMS_API.Common.Constants;
using SLMS_API.Common.Enums;
using SLMS_API.Domain.Entities;

namespace SLMS_API.Infrastructure.Data;

public static class SuperAdminSeedData
{
    public const string DefaultEmail = "superadmin@slms.com";
    public const string DefaultPassword = "SuperAdmin@123";

    public static async Task SeedAsync(IServiceProvider serviceProvider, CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SuperAdminSeedData");

        var email = configuration["Identity:SuperAdminEmail"] ?? DefaultEmail;
        var password = configuration["Identity:SuperAdminPassword"] ?? DefaultPassword;

        if (!await roleManager.RoleExistsAsync(RoleDefinitions.SuperAdmin))
        {
            await roleManager.CreateAsync(new IdentityRole(RoleDefinitions.SuperAdmin));
        }

        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null)
        {
            if (!await userManager.IsInRoleAsync(existing, RoleDefinitions.SuperAdmin))
            {
                await userManager.AddToRoleAsync(existing, RoleDefinitions.SuperAdmin);
                logger.LogInformation("Assigned SuperAdmin role to existing user {Email}", email);
            }

            return;
        }

        var now = DateTime.UtcNow;
        var user = new ApplicationUser
        {
            Id = "a0000001-0000-4000-8000-000000000001",
            FullName = "SLMS Super Admin",
            UserName = email,
            Email = email,
            PhoneNumber = "+919999900001",
            EmailConfirmed = true,
            OnboardingStep = OnboardingStep.Completed,
            UserType = UserType.OrganizationOwner,
            IsActive = true,
            CreatedAtUtc = now,
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to create super admin: {string.Join("; ", result.Errors.Select(e => e.Description))}");
        }

        await userManager.AddToRoleAsync(user, RoleDefinitions.SuperAdmin);

        logger.LogInformation("SuperAdmin user seeded for {Email}", email);
    }
}
