using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class MeasurementConfiguration : IEntityTypeConfiguration<Measurement>
{
    public void Configure(EntityTypeBuilder<Measurement> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.MeasureMm).IsRequired();
        builder.Property(m => m.HeightMm).IsRequired();

        builder.Property(m => m.Configuration)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

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

        builder.HasIndex(m => m.TenantId);
        builder.HasIndex(m => m.LeadId);

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
    }
}
