using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class GlassConfiguration : IEntityTypeConfiguration<Glass>
{
    public void Configure(EntityTypeBuilder<Glass> builder)
    {
        builder.HasKey(g => g.Id);

        builder.Property(g => g.Position).IsRequired();
        builder.Property(g => g.IsDoor).IsRequired();
        builder.Property(g => g.WidthMm).IsRequired();
        builder.Property(g => g.HeightMm).IsRequired();

        builder.HasIndex(g => g.TenantId);
        builder.HasIndex(g => g.MeasurementId);

        builder.HasOne(g => g.Measurement)
            .WithMany(m => m.Glasses)
            .HasForeignKey(g => g.MeasurementId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
