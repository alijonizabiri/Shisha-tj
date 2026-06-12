using Shisha.Domain.Common;

namespace Shisha.Domain.Entities;

public sealed class Lead : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public required string Name { get; set; }
    public required string Phone { get; set; }
    public required string Product { get; set; }
    public string? Source { get; set; }
    public string? Note { get; set; }

    public DateOnly CallDate { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public ICollection<Measurement> Measurements { get; set; } = [];
}
