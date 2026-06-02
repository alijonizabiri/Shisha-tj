namespace Shisha.Application.Abstractions;

public interface ICurrentUser
{
    Guid UserId { get; }
    Guid TenantId { get; }
    string Role { get; }
    bool IsAuthenticated { get; }
}
