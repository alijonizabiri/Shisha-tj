using Shisha.Domain.Common;
using Shisha.Domain.Enums;

namespace Shisha.Domain.Entities;

public sealed class User : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string FullName { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal? MeasurerFixedFeeTjs { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
