using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class Hole : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid GlassId { get; set; }

    public int XMm { get; set; }
    public int YMm { get; set; }
    public int RadiusMm { get; set; }
    public HoleType HoleType { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public Glass Glass { get; set; } = null!;
}
