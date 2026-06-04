using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.AmountTjs)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.Kind)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(p => p.Note)
            .HasMaxLength(1000);

        builder.HasIndex(p => p.TenantId);
        builder.HasIndex(p => p.LeadId);

        builder.HasOne(p => p.Lead)
            .WithMany(l => l.Payments)
            .HasForeignKey(p => p.LeadId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
