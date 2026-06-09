using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.Name).IsRequired().HasMaxLength(200);
        builder.Property(l => l.Phone).IsRequired().HasMaxLength(50);
        builder.Property(l => l.Product).IsRequired().HasMaxLength(200);
        builder.Property(l => l.Source).HasMaxLength(100);
        builder.Property(l => l.RefusalNote).HasMaxLength(1000);
        builder.Property(l => l.Note).HasMaxLength(2000);

        builder.HasIndex(l => l.TenantId);
        builder.HasIndex(l => l.Status);

        builder.HasOne(l => l.AssignedMeasurer)
            .WithMany()
            .HasForeignKey(l => l.AssignedMeasurerId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);

        builder.HasOne<RefusalReason>()
            .WithMany()
            .HasForeignKey(l => l.RefusalReasonId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}
