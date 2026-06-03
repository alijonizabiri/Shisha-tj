using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Infrastructure.Persistence;
using Shisha.Infrastructure.Persistence.Interceptors;

namespace Shisha.Api.IntegrationTests;

public sealed class AuditInterceptorTests
{
    private static AppDbContext CreateContext(ICurrentUser currentUser)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new AuditInterceptor(currentUser))
            .Options;
        return new AppDbContext(options, currentUser);
    }

    [Fact]
    public async Task Added_entity_fills_audit_fields_and_tenant_id()
    {
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        await using var ctx = CreateContext(new StubCurrentUser(userId, tenantId));

        var user = new User
        {
            TenantId = tenantId,
            Email = "test@example.com",
            PasswordHash = "hash",
            FullName = "Test User",
            Role = UserRole.Admin,
        };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        Assert.NotEqual(default, user.CreatedAt);
        Assert.NotEqual(default, user.UpdatedAt);
        Assert.Equal(userId, user.CreatedByUserId);
        Assert.Equal(userId, user.UpdatedByUserId);
        Assert.Equal(tenantId, user.TenantId);
    }

    [Fact]
    public async Task Modified_entity_updates_updated_fields_only()
    {
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        await using var ctx = CreateContext(new StubCurrentUser(userId, tenantId));

        var user = new User
        {
            TenantId = tenantId,
            Email = "test@example.com",
            PasswordHash = "hash",
            FullName = "Test User",
            Role = UserRole.Admin,
        };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        var createdAt = user.CreatedAt;
        var createdBy = user.CreatedByUserId;

        user.FullName = "Changed";
        await ctx.SaveChangesAsync();

        Assert.Equal(createdAt, user.CreatedAt);
        Assert.Equal(createdBy, user.CreatedByUserId);
        Assert.True(user.UpdatedAt >= createdAt);
        Assert.Equal(userId, user.UpdatedByUserId);
    }

    [Fact]
    public async Task Deleted_soft_deletable_entity_becomes_soft_deleted()
    {
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        await using var ctx = CreateContext(new StubCurrentUser(userId, tenantId));

        var user = new User
        {
            TenantId = tenantId,
            Email = "delete@example.com",
            PasswordHash = "hash",
            FullName = "To Delete",
            Role = UserRole.Operator,
        };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        ctx.Users.Remove(user);
        await ctx.SaveChangesAsync();

        Assert.True(user.IsDeleted);
        Assert.NotNull(user.DeletedAt);
        Assert.Equal(userId, user.DeletedByUserId);

        // Row still exists — it was soft-deleted, not removed
        var inDb = await ctx.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == user.Id);
        Assert.NotNull(inDb);
        Assert.True(inDb.IsDeleted);
    }

    private sealed class StubCurrentUser(Guid userId, Guid tenantId) : ICurrentUser
    {
        public Guid UserId { get; } = userId;
        public Guid TenantId { get; } = tenantId;
        public string Role { get; } = "Admin";
        public bool IsAuthenticated { get; } = true;
    }
}
