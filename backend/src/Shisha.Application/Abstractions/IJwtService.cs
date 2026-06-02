using Shisha.Domain.Entities;

namespace Shisha.Application.Abstractions;

public interface IJwtService
{
    string GenerateAccessToken(User user, out DateTime expiresAt);
    string GenerateRefreshToken();
    string HashToken(string token);
}
