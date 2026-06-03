using Shisha.Domain.Common;

namespace Shisha.Domain.Entities;

public sealed class Product : ITenantOwned
{
    public Guid Id { get; init; } = Guid.CreateVersion7();
    public Guid TenantId { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; } = true;
}
