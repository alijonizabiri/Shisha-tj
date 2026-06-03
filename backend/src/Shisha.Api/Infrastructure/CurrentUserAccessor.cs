using System.IdentityModel.Tokens.Jwt;
using Shisha.Application.Abstractions;
using System.Security.Claims;

namespace Shisha.Api.Infrastructure;

// MapInboundClaims = false is set on JwtBearerOptions, so JWT short names are used
// as-is in the ClaimsPrincipal (e.g. "sub" instead of ClaimTypes.NameIdentifier).
public sealed class CurrentUserAccessor(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public Guid UserId => IsAuthenticated
        ? Guid.Parse(Principal!.FindFirstValue(JwtRegisteredClaimNames.Sub)!)
        : Guid.Empty;

    public Guid TenantId => IsAuthenticated
        ? Guid.Parse(Principal!.FindFirstValue("tenantId")!)
        : Guid.Empty;

    public string Role => Principal?.FindFirstValue("role") ?? string.Empty;
}
