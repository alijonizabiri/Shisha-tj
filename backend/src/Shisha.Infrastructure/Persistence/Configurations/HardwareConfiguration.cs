using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class HardwareConfiguration : IEntityTypeConfiguration<Hardware>
{
    public void Configure(EntityTypeBuilder<Hardware> builder)
    {
        builder.HasKey(h => h.Id);

        builder.Property(h => h.CostTjs)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(h => h.Color)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(h => h.TenantId);
        builder.HasIndex(h => h.MeasurementId).IsUnique();

        builder.HasOne(h => h.Measurement)
            .WithOne(m => m.Hardware)
            .HasForeignKey<Hardware>(h => h.MeasurementId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
