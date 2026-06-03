using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Shisha.Application.Abstractions;
using Shisha.Infrastructure.Persistence.Interceptors;

namespace Shisha.Infrastructure.Persistence;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var nullUser = new NullCurrentUser();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=shisha_tj;Username=shisha;Password=shisha_dev_pass")
            .UseSnakeCaseNamingConvention()
            .AddInterceptors(new AuditInterceptor(nullUser))
            .Options;

        return new AppDbContext(options, nullUser);
    }
}

// Used only by EF design-time tools — no DI, no auth context.
internal sealed class NullCurrentUser : ICurrentUser
{
    public Guid UserId => Guid.Empty;
    public Guid TenantId => Guid.Empty;
    public string Role => string.Empty;
    public bool IsAuthenticated => false;
}
