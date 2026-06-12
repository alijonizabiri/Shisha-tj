using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class Measurement : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    public Guid? MeasurerId { get; set; }
    public Guid? LeadId { get; set; }

    public LeadStatus Status { get; set; } = LeadStatus.New;
    public Guid? AssignedMeasurerId { get; set; }
    public Guid? RefusalReasonId { get; set; }
    public string? RefusalNote { get; set; }

    public string? Product { get; set; }
    public required string Address { get; set; }

    public int MeasureMm { get; set; }
    public int HeightMm { get; set; }
    public GlassColor GlassColor { get; set; }
    public HardwareColor HardwareColor { get; set; }
    public HandleSide HandleSide { get; set; } = HandleSide.Right;

    public decimal? DealPriceTjs { get; set; }
    public decimal? DeliveryCostTjs { get; set; }
    public DateOnly? InstallationDate { get; set; }
    public DateTime? InstalledAt { get; set; }
    public DateOnly? WarrantyUntil { get; set; }

    public DateTime MeasuredAt { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public User? Measurer { get; set; }
    public User? AssignedMeasurer { get; set; }
    public Lead? Lead { get; set; }
    public ICollection<Glass> Glasses { get; set; } = [];
    public Hardware? Hardware { get; set; }
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<Expense> Expenses { get; set; } = [];
}
