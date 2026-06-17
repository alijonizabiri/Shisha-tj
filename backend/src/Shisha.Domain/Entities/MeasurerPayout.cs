using Shisha.Domain.Common;

namespace Shisha.Domain.Entities;

public sealed class MeasurerPayout : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public Guid MeasurementId { get; set; }
    public Guid MeasurerId { get; set; }

    public decimal CalculatedAmountTjs { get; set; }
    public decimal ActualAmountTjs { get; set; }

    public bool IsPaid { get; set; }
    public DateOnly? PaidAt { get; set; }
    public string? Note { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public Measurement Measurement { get; set; } = null!;
    public User Measurer { get; set; } = null!;
}
