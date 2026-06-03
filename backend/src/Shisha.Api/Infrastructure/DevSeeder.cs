using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Api.Infrastructure;

/// <summary>
/// Seeds one tenant + three dev users on first startup in Development.
/// Safe to run multiple times — checks existence before inserting.
/// </summary>
public static class DevSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        // Apply any pending migrations automatically in dev
        await db.Database.MigrateAsync();

        // Idempotent: skip if any tenant already exists
        if (await db.Tenants.IgnoreQueryFilters().AnyAsync())
            return;

        var tenant = new Tenant { Name = "SHISHA_TJ (dev)" };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        User[] users =
        [
            new User
            {
                TenantId  = tenant.Id,
                Email     = "admin@shisha.tj",
                PasswordHash = hasher.Hash("admin123"),
                FullName  = "Администратор",
                Role      = UserRole.Admin,
                IsActive  = true,
            },
            new User
            {
                TenantId  = tenant.Id,
                Email     = "operator@shisha.tj",
                PasswordHash = hasher.Hash("operator123"),
                FullName  = "Оператор",
                Role      = UserRole.Operator,
                IsActive  = true,
            },
            new User
            {
                TenantId  = tenant.Id,
                Email     = "measurer@shisha.tj",
                PasswordHash = hasher.Hash("measurer123"),
                FullName  = "Замерщик",
                Role      = UserRole.Measurer,
                IsActive  = true,
            },
        ];

        db.Users.AddRange(users);
        await db.SaveChangesAsync();

        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("Dev seed complete. Tenant: {TenantId}", tenant.Id);
        logger.LogInformation("  admin@shisha.tj     / admin123    (Admin)");
        logger.LogInformation("  operator@shisha.tj  / operator123 (Operator)");
        logger.LogInformation("  measurer@shisha.tj  / measurer123 (Measurer)");
    }
}
