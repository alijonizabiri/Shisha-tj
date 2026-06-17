using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class FactoryPaymentConfiguration : IEntityTypeConfiguration<FactoryPayment>
{
    public void Configure(EntityTypeBuilder<FactoryPayment> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.AmountTjs)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.Note)
            .HasMaxLength(1000);

        builder.HasIndex(p => p.TenantId);
        builder.HasIndex(p => p.FactoryOrderId);

        builder.HasOne(p => p.FactoryOrder)
            .WithMany(o => o.FactoryPayments)
            .HasForeignKey(p => p.FactoryOrderId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
