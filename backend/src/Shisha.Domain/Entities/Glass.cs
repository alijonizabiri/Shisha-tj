using Shisha.Domain.Common;

namespace Shisha.Domain.Entities;

public sealed class Glass : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid MeasurementId { get; set; }

    /// <summary>0-based index, left → right.</summary>
    public int Position { get; set; }
    public bool IsDoor { get; set; }
    public int WidthMm { get; set; }
    public int HeightMm { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public Measurement Measurement { get; set; } = null!;
    public ICollection<Hole> Holes { get; set; } = [];
}
