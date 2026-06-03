using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Shisha.Application.Abstractions;
using Shisha.Domain.Common;

namespace Shisha.Infrastructure.Persistence.Interceptors;

public sealed class AuditInterceptor(ICurrentUser currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplyAudit(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAudit(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAudit(DbContext? context)
    {
        if (context is null) return;

        var now = DateTime.UtcNow;
        Guid? userId = currentUser.IsAuthenticated ? currentUser.UserId : null;
        Guid? tenantId = currentUser.IsAuthenticated ? currentUser.TenantId : null;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            // Convert hard deletes to soft deletes
            if (entry.State == EntityState.Deleted && entry.Entity is ISoftDeletable softDeletable)
            {
                entry.State = EntityState.Modified;
                softDeletable.IsDeleted = true;
                softDeletable.DeletedAt = now;
                softDeletable.DeletedByUserId = userId;

                if (entry.Entity is BaseEntity deletedBase)
                {
                    deletedBase.UpdatedAt = now;
                    deletedBase.UpdatedByUserId = userId;
                }
                continue;
            }

            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    baseEntity.CreatedAt = now;
                    baseEntity.UpdatedAt = now;
                    baseEntity.CreatedByUserId = userId;
                    baseEntity.UpdatedByUserId = userId;
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = now;
                    baseEntity.UpdatedByUserId = userId;
                }
            }

            if (entry.State == EntityState.Added
                && entry.Entity is ITenantOwned tenantOwned
                && tenantId.HasValue)
            {
                tenantOwned.TenantId = tenantId.Value;
            }
        }
    }
}
