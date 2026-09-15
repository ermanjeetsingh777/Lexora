using Microsoft.Extensions.Options;
using Serilog;
using SLMS_API;
using SLMS_API.Application.Helpers;
using SLMS_API.Application.Options;
using SLMS_API.Extensions;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.DependencyInjection;
using SLMS_API.Infrastructure.Payments;
using System.Reflection;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

MemberContactHelper.Configure(builder.Configuration["Identity:MemberSyntheticEmailDomain"]);

// User secrets load automatically only under Development, but the Local/Dev/QA/UAT profiles
// need them too — gateway keys must never sit in a checked-in appsettings file.
if (!builder.Environment.IsProduction() && !builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>(optional: true);
}

builder.Host.UseSerilog((context, services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext();
});

builder.Services.AddSwaggerGenWithAuth();
builder.Services.AddPresentation();

builder.Services.AddApplicationInfrastructure(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (allowedOrigins is { Length: > 0 })
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            return;
        }

        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
//builder.Services.AddEndpoints(Assembly.GetExecutingAssembly());

WebApplication app = builder.Build();

if (args.Contains("--seed-superadmin", StringComparer.OrdinalIgnoreCase))
{
    await DbSeeder.SeedRolesAsync(app.Services);
    await SuperAdminSeedData.SeedAsync(app.Services);
    return;
}

await DbSeeder.MigrateAndSeedAsync(app.Services);

// Online checkout is gated by PaymentGateway:Enabled. Keys still live under Razorpay:*.
var paymentGateway = app.Services.GetRequiredService<IOptions<PaymentGatewayOptions>>().Value;
var razorpayOptions = app.Services.GetRequiredService<IOptions<RazorpayOptions>>().Value;
if (paymentGateway.Enabled)
{
    var keyMismatch = RazorpayKeys.DescribeMismatch(razorpayOptions.KeyId, app.Environment.IsProduction());
    if (keyMismatch is not null)
    {
        app.Logger.LogError("Razorpay is misconfigured for the {Environment} environment. {Detail}",
            app.Environment.EnvironmentName, keyMismatch);
    }
    else
    {
        app.Logger.LogInformation("Payment gateway enabled in {Mode} mode ({Environment}).",
            RazorpayKeys.IsTestKey(razorpayOptions.KeyId) ? "TEST" : "LIVE",
            app.Environment.EnvironmentName);
    }
}
else
{
    app.Logger.LogInformation("Payment gateway is OFF (PaymentGateway:Enabled=false). Offline / UPI flows only.");
}

// Configure the HTTP request pipeline.
var isSwaggerEnabled = app.Configuration.GetValue<bool>("Swagger:Enabled",
    !app.Environment.IsProduction() && (
        app.Environment.IsDevelopment() ||
        app.Environment.IsEnvironment("Local") ||
        app.Environment.IsEnvironment("Dev") ||
        app.Environment.IsEnvironment("QA") ||
        app.Environment.IsEnvironment("UAT")));

if (isSwaggerEnabled)
{
    app.UseSwaggerWithUi();
}

app.UseHttpsRedirection();

app.UseCors("DefaultCorsPolicy");

app.UseRequestContextLogging();

app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", (IConfiguration config) =>
{
    var swaggerOn = config.GetValue<bool>("Swagger:Enabled", false);
    if (swaggerOn)
    {
        return Results.Redirect("/swagger");
    }

    return Results.Ok(new
    {
        service = "Lexora Smart Library Management API",
        status = "Healthy",
        version = "v1.0.0-beta",
        timestamp = DateTime.UtcNow
    });
});

app.Run();
