using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class FactoryOrderItemConfiguration : IEntityTypeConfiguration<FactoryOrderItem>
{
    public void Configure(EntityTypeBuilder<FactoryOrderItem> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.GlassCostTjs)
            .HasPrecision(18, 2);

        builder.Property(i => i.ReworkReason)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(i => i.TenantId);
        builder.HasIndex(i => i.FactoryOrderId);

        builder.HasOne(i => i.Glass)
            .WithMany()
            .HasForeignKey(i => i.GlassId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
