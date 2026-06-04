using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class FactoryOrderItem : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public Guid FactoryOrderId { get; set; }
    public Guid GlassId { get; set; }

    public decimal? GlassCostTjs { get; set; }
    public bool IsRework { get; set; }
    public ReworkReason? ReworkReason { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public FactoryOrder FactoryOrder { get; set; } = null!;
    public Glass Glass { get; set; } = null!;
}
