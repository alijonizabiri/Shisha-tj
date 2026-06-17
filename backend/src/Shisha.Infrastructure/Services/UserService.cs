using Microsoft.EntityFrameworkCore;
using Shisha.Application.Users;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
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
            .Select(u => new MeasurerDto(u.Id, u.FullName, u.Email, u.MeasurerFixedFeeTjs))
            .ToListAsync(ct);
    }

    public async Task<MeasurerDto> UpdateMeasurerFeeAsync(
        Guid userId,
        UpdateUserMeasurerFeeRequest request,
        CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException($"User {userId} not found.");

        user.MeasurerFixedFeeTjs = request.MeasurerFixedFeeTjs;
        await db.SaveChangesAsync(ct);

        return new MeasurerDto(user.Id, user.FullName, user.Email, user.MeasurerFixedFeeTjs);
    }
}
