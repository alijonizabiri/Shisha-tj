using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class Expense : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public Guid? MeasurementId { get; set; }
    public decimal AmountTjs { get; set; }
    public ExpenseKind Kind { get; set; }
    public string? Description { get; set; }
    public DateOnly SpentAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public Measurement? Measurement { get; set; }
}
