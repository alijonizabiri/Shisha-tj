using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class FactoryOrder : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public FactoryOrderStatus Status { get; set; } = FactoryOrderStatus.Draft;
    public DateOnly? OrderedAt { get; set; }
    public DateOnly? ReceivedAt { get; set; }
    public decimal? FactoryTotalTjs { get; set; }
    public string? Note { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public ICollection<FactoryOrderItem> Items { get; set; } = [];
}
