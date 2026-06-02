using System.Security.Claims;
using Shisha.Application.Abstractions;

namespace Shisha.Api.Infrastructure;

public sealed class CurrentUserAccessor(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public Guid UserId => IsAuthenticated
        ? Guid.Parse(Principal!.FindFirstValue(ClaimTypes.NameIdentifier)!)
        : Guid.Empty;

    public Guid TenantId => IsAuthenticated
        ? Guid.Parse(Principal!.FindFirstValue("tenantId")!)
        : Guid.Empty;

    public string Role => Principal?.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
}
