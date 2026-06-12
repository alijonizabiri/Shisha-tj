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
        builder.Property(l => l.Note).HasMaxLength(2000);

        builder.HasIndex(l => l.TenantId);
    }
}
