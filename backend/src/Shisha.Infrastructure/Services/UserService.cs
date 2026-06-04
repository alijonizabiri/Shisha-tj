using Microsoft.EntityFrameworkCore;
using Shisha.Application.Users;
using Shisha.Domain.Enums;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class UserService(AppDbContext db) : IUserService
{
    public async Task<IReadOnlyList<MeasurerDto>> GetMeasurersAsync(CancellationToken ct = default)
    {
        return await db.Users
            .AsNoTracking()
            .Where(u => u.Role == UserRole.Measurer && u.IsActive)
            .OrderBy(u => u.FullName)
            .Select(u => new MeasurerDto(u.Id, u.FullName, u.Email))
            .ToListAsync(ct);
    }
}
