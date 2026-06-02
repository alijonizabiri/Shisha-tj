using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Domain.Common;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser currentUser)
    : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ApplyGlobalFilters(modelBuilder);
    }

    private void ApplyGlobalFilters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            var isTenantOwned = typeof(ITenantOwned).IsAssignableFrom(clrType);
            var isSoftDeletable = typeof(ISoftDeletable).IsAssignableFrom(clrType);

            if (!isTenantOwned && !isSoftDeletable) continue;

            var methodName = (isTenantOwned, isSoftDeletable) switch
            {
                (true, true)  => nameof(TenantAndSoftDeleteFilter),
                (false, true) => nameof(SoftDeleteFilter),
                _             => nameof(TenantFilter),
            };

            var method = typeof(AppDbContext)
                .GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Instance)!
                .MakeGenericMethod(clrType);

            var filter = (LambdaExpression)method.Invoke(this, null)!;
            entityType.SetQueryFilter(filter);
        }
    }

    private Expression<Func<T, bool>> TenantAndSoftDeleteFilter<T>()
        where T : class, ITenantOwned, ISoftDeletable
        => e => e.TenantId == currentUser.TenantId && !e.IsDeleted;

    private Expression<Func<T, bool>> SoftDeleteFilter<T>()
        where T : class, ISoftDeletable
        => e => !e.IsDeleted;

    private Expression<Func<T, bool>> TenantFilter<T>()
        where T : class, ITenantOwned
        => e => e.TenantId == currentUser.TenantId;
}
