using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class HoleConfiguration : IEntityTypeConfiguration<Hole>
{
    public void Configure(EntityTypeBuilder<Hole> builder)
    {
        builder.HasKey(h => h.Id);

        builder.Property(h => h.XMm).IsRequired();
        builder.Property(h => h.YMm).IsRequired();
        builder.Property(h => h.RadiusMm).IsRequired();

        builder.Property(h => h.HoleType)
            .HasConversion<string>()
            .HasMaxLength(10)
            .IsRequired();

        builder.HasIndex(h => h.TenantId);
        builder.HasIndex(h => h.GlassId);

        builder.HasOne(h => h.Glass)
            .WithMany(g => g.Holes)
            .HasForeignKey(h => h.GlassId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
