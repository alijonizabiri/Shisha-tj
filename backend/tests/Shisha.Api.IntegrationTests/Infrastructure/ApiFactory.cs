using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Shisha.Application.Abstractions;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Infrastructure.Persistence;
using Shisha.Infrastructure.Persistence.Interceptors;

namespace Shisha.Api.IntegrationTests.Infrastructure;

public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    // Built in InitializeAsync after Docker availability is confirmed
    private PostgreSqlContainer? _postgres;

    /// <summary>False when Docker is not running — tests guard on this and return early.</summary>
    public bool IsAvailable { get; private set; }

    public const string AdminEmail = "admin@integration.test";
    public const string AdminPassword = "Integration-Pass-123!";
    public const string MeasurerEmail = "measurer@integration.test";

    public Guid MeasurerId { get; private set; }

    public async Task InitializeAsync()
    {
        try
        {
            _postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();
            await _postgres.StartAsync();
        }
        catch
        {
            // Docker is not running — tests will return early via guard
            IsAvailable = false;
            return;
        }

        // Services is lazily built on first access — container is already running by this point
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var tenant = new Tenant { Name = "Integration Test Co." };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var admin = new User
        {
            TenantId = tenant.Id,
            Email = AdminEmail,
            PasswordHash = hasher.Hash(AdminPassword),
            FullName = "Integration Admin",
            Role = UserRole.Admin,
            IsActive = true,
        };
        db.Users.Add(admin);

        var measurer = new User
        {
            TenantId = tenant.Id,
            Email = MeasurerEmail,
            PasswordHash = hasher.Hash(AdminPassword),
            FullName = "Integration Measurer",
            Role = UserRole.Measurer,
            IsActive = true,
        };
        db.Users.Add(measurer);
        await db.SaveChangesAsync();

        MeasurerId = measurer.Id;
        IsAvailable = true;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Only override if the container is running (Docker available)
        if (_postgres is null) return;

        builder.ConfigureServices(services =>
        {
            var existing = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (existing is not null)
                services.Remove(existing);

            services.AddDbContext<AppDbContext>((sp, opts) =>
                opts.UseNpgsql(_postgres.GetConnectionString())
                    .UseSnakeCaseNamingConvention()
                    .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));
        });
    }

    public new async Task DisposeAsync()
    {
        if (_postgres is not null)
            await _postgres.StopAsync();
        await base.DisposeAsync();
    }
}
