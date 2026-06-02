using Shisha.Domain.Common;

namespace Shisha.Domain.Entities;

public sealed class Tenant : BaseEntity
{
    public required string Name { get; set; }
}
