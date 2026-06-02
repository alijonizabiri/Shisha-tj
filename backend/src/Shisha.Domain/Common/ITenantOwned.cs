namespace Shisha.Domain.Common;

public interface ITenantOwned
{
    Guid TenantId { get; set; }
}
