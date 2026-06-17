using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class MeasurerPayoutConfiguration : IEntityTypeConfiguration<MeasurerPayout>
{
    public void Configure(EntityTypeBuilder<MeasurerPayout> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.CalculatedAmountTjs).HasPrecision(18, 2).IsRequired();
        builder.Property(p => p.ActualAmountTjs).HasPrecision(18, 2).IsRequired();
        builder.Property(p => p.Note).HasMaxLength(1000);

        builder.HasIndex(p => p.TenantId);
        builder.HasIndex(p => p.MeasurementId).IsUnique();

        builder.HasOne(p => p.Measurement)
            .WithOne(m => m.MeasurerPayout)
            .HasForeignKey<MeasurerPayout>(p => p.MeasurementId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Measurer)
            .WithMany()
            .HasForeignKey(p => p.MeasurerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
