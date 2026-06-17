using Shisha.Domain.Common;

namespace Shisha.Domain.Entities;

public sealed class FactoryPayment : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid FactoryOrderId { get; set; }
    public decimal AmountTjs { get; set; }
    public DateOnly PaidAt { get; set; }
    public string? Note { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public FactoryOrder FactoryOrder { get; set; } = null!;
}
