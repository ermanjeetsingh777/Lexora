using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using SLMS_API.Application.Validation.Auth;
using SLMS_API.Application.Options;
using SLMS_API.Application.Services;
using SLMS_API.Application.Services.Interfaces;
using SLMS_API.Domain.Entities;
using SLMS_API.Infrastructure.Authorization;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.Email;
using SLMS_API.Infrastructure.Repositories;
using SLMS_API.Infrastructure.Repositories.Interfaces;
using SLMS_API.Infrastructure.Support;

namespace SLMS_API.Infrastructure.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<DemoOptions>(configuration.GetSection(DemoOptions.SectionName));
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.Configure<AppOptions>(configuration.GetSection(AppOptions.SectionName));

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
            options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
        });

        services
            .AddIdentity<ApplicationUser, IdentityRole>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<DataProtectionTokenProviderOptions>(options =>
        {
            options.TokenLifespan = TimeSpan.FromHours(1);
        });

        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey));

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = key,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        services.AddAuthorization();
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

        services.AddFluentValidationAutoValidation();
        services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
        services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IOtpCodeRepository, OtpCodeRepository>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<IAppEmailService, AppEmailService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IPermissionResolver, PermissionResolver>();
        services.AddScoped<IPackageService, PackageService>();
        services.AddScoped<IAddonService, AddonService>();
        services.AddScoped<IUserPackageService, UserPackageService>();
        services.AddScoped<IPackageSubscriptionService, PackageSubscriptionService>();
        services.AddScoped<IPackageEntitlementService, PackageEntitlementService>();
        services.AddScoped<IInstitutionService, InstitutionService>();
        services.AddScoped<IBranchService, BranchService>();
        services.AddScoped<ILibraryService, LibraryService>();
        services.AddScoped<IPlanService, PlanService>();
        // Organization operational services
        services.AddScoped<IMemberService, MemberService>();
        services.AddScoped<ISeatService, SeatService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<IAttendanceScannerService, AttendanceScannerService>();
        services.AddScoped<ISubscriptionService, SubscriptionService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddSingleton<SupportStatusSimulator>();
        services.AddScoped<ISupportAccessResolver, SupportAccessResolver>();
        services.AddScoped<ISupportService, SupportService>();
        services.AddScoped<IBookService, BookService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ICustomerReviewService, CustomerReviewService>();

        services.AddHttpContextAccessor();

        return services;
    }
}
