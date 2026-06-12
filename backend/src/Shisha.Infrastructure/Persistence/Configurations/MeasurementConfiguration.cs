using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class MeasurementConfiguration : IEntityTypeConfiguration<Measurement>
{
    public void Configure(EntityTypeBuilder<Measurement> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Product).HasMaxLength(200);

        builder.Property(m => m.Address)
            .IsRequired()
            .HasMaxLength(500)
            .HasDefaultValue("Не указан");

        builder.Property(m => m.MeasureMm).IsRequired();
        builder.Property(m => m.HeightMm).IsRequired();

        builder.Property(m => m.GlassColor)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(m => m.HardwareColor)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(m => m.HandleSide)
            .HasConversion<string>()
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(m => m.DealPriceTjs).HasPrecision(18, 2);
        builder.Property(m => m.DeliveryCostTjs).HasPrecision(18, 2);

        builder.Property(m => m.RefusalNote).HasMaxLength(1000);

        builder.HasIndex(m => m.TenantId);
        builder.HasIndex(m => m.LeadId);
        builder.HasIndex(m => m.Status);

        builder.HasOne(m => m.Lead)
            .WithMany(l => l.Measurements)
            .HasForeignKey(m => m.LeadId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        // PostgreSQL xmin system column as optimistic concurrency token
        builder.Property<uint>("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();

        builder.HasOne(m => m.Measurer)
            .WithMany()
            .HasForeignKey(m => m.MeasurerId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        builder.HasOne(m => m.AssignedMeasurer)
            .WithMany()
            .HasForeignKey(m => m.AssignedMeasurerId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        builder.HasOne<RefusalReason>()
            .WithMany()
            .HasForeignKey(m => m.RefusalReasonId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        builder.HasMany(m => m.Payments)
            .WithOne(p => p.Measurement)
            .HasForeignKey(p => p.MeasurementId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(m => m.Expenses)
            .WithOne(e => e.Measurement)
            .HasForeignKey(e => e.MeasurementId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}
