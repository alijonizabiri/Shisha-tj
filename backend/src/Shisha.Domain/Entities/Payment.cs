using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class Payment : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public Guid LeadId { get; set; }
    public decimal AmountTjs { get; set; }
    public PaymentKind Kind { get; set; }
    public DateOnly PaidAt { get; set; }
    public string? Note { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public Lead Lead { get; set; } = null!;
}
