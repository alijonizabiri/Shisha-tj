using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class FactoryOrderConfiguration : IEntityTypeConfiguration<FactoryOrder>
{
    public void Configure(EntityTypeBuilder<FactoryOrder> builder)
    {
        builder.HasKey(o => o.Id);

        builder.Property(o => o.Status)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(o => o.FactoryTotalTjs)
            .HasPrecision(18, 2);

        builder.Property(o => o.Note)
            .HasMaxLength(2000);

        builder.HasIndex(o => o.TenantId);

        builder.HasMany(o => o.Items)
            .WithOne(i => i.FactoryOrder)
            .HasForeignKey(i => i.FactoryOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
