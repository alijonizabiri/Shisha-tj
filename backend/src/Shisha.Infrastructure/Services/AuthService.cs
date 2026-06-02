using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Shisha.Application.Abstractions;
using Shisha.Application.Auth;
using Shisha.Domain.Entities;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Configuration;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class AuthService(
    AppDbContext db,
    IJwtService jwtService,
    IPasswordHasher passwordHasher,
    IOptions<JwtOptions> options) : IAuthService
{
    private readonly JwtOptions _opts = options.Value;

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        // IgnoreQueryFilters is intentional: no tenant context exists at login time.
        // The global filter (TenantId == currentUser.TenantId) would return nothing
        // because currentUser.TenantId == Guid.Empty for an unauthenticated request.
        var user = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted && u.IsActive, ct);

        if (user is null || !passwordHasher.Verify(user.PasswordHash, request.Password))
            throw new UnauthorizedException("Invalid email or password.");

        return await IssueTokensAsync(user, ct);
    }

    public async Task<LoginResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = jwtService.HashToken(request.RefreshToken);

        // IgnoreQueryFilters is intentional: refresh tokens are not tenant-scoped;
        // included User navigation must also bypass the tenant/soft-delete filter.
        var token = await db.RefreshTokens
            .IgnoreQueryFilters()
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(
                rt => rt.TokenHash == hash && rt.RevokedAt == null && rt.ExpiresAt > DateTime.UtcNow,
                ct);

        if (token is null || token.User.IsDeleted || !token.User.IsActive)
            throw new UnauthorizedException("Invalid or expired refresh token.");

        token.RevokedAt = DateTime.UtcNow;
        return await IssueTokensAsync(token.User, ct);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = jwtService.HashToken(refreshToken);

        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash && rt.RevokedAt == null, ct);

        if (token is not null)
        {
            token.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    private async Task<LoginResponse> IssueTokensAsync(User user, CancellationToken ct)
    {
        var accessToken = jwtService.GenerateAccessToken(user, out var expiresAt);
        var rawRefreshToken = jwtService.GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = jwtService.HashToken(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(_opts.RefreshTokenDays),
        });

        await db.SaveChangesAsync(ct);

        return new LoginResponse(accessToken, rawRefreshToken, expiresAt);
    }
}
