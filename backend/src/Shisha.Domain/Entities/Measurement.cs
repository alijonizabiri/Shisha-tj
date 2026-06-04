using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class Measurement : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }

    /// <summary>The user who took this measurement (set from JWT on save).</summary>
    public Guid? MeasurerId { get; set; }
    public Guid? LeadId { get; set; }

    public int MeasureMm { get; set; }
    public int HeightMm { get; set; }
    public CabinConfiguration Configuration { get; set; }
    public GlassColor GlassColor { get; set; }
    public HardwareColor HardwareColor { get; set; }
    public HandleSide HandleSide { get; set; } = HandleSide.Right;

    public DateTime MeasuredAt { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public User? Measurer { get; set; }
    public Lead? Lead { get; set; }
    public ICollection<Glass> Glasses { get; set; } = [];
    public Hardware? Hardware { get; set; }
}
