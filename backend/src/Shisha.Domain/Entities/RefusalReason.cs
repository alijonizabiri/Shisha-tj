using Shisha.Domain.Common;

namespace Shisha.Domain.Entities;

public sealed class RefusalReason : ITenantOwned
{
    public Guid Id { get; init; } = Guid.CreateVersion7();
    public Guid TenantId { get; set; }
    public required string Label { get; set; }
    public int SortOrder { get; set; }
}
