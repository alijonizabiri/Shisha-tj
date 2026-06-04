using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Shisha.Domain.Entities;

namespace Shisha.Infrastructure.Persistence.Configurations;

public sealed class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.AmountTjs)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(e => e.Kind)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(e => e.Description)
            .HasMaxLength(1000);

        builder.HasIndex(e => e.TenantId);
        builder.HasIndex(e => e.LeadId);

        builder.HasOne(e => e.Lead)
            .WithMany(l => l.Expenses)
            .HasForeignKey(e => e.LeadId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}
