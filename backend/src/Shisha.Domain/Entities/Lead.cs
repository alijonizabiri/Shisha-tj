using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class Lead : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public required string Name { get; set; }
    public required string Phone { get; set; }
    public required string Product { get; set; }
    public LeadStatus Status { get; set; } = LeadStatus.New;
    public string? Source { get; set; }
    public string? Note { get; set; }

    public Guid? RefusalReasonId { get; set; }
    public string? RefusalNote { get; set; }

    public DateOnly CallDate { get; set; }

    public Guid? AssignedMeasurerId { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public User? AssignedMeasurer { get; set; }
    public ICollection<Measurement> Measurements { get; set; } = [];
}
