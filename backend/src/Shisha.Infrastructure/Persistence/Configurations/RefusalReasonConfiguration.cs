using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class RefusalReasonConfiguration : IEntityTypeConfiguration<RefusalReason>
{
    public void Configure(EntityTypeBuilder<RefusalReason> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Label)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.SortOrder)
            .HasDefaultValue(0);

        builder.HasIndex(r => r.TenantId);
    }
}
