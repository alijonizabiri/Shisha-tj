using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class Hardware : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public Guid MeasurementId { get; set; }
    public HardwareColor Color { get; set; }
    public decimal CostTjs { get; set; }
    public DateOnly? PurchasedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public Measurement Measurement { get; set; } = null!;
}
