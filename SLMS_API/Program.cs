using Serilog;
using SLMS_API;
using SLMS_API.Extensions;
using SLMS_API.Infrastructure.Data;
using SLMS_API.Infrastructure.DependencyInjection;
using System.Reflection;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
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
