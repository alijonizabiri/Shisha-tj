using Microsoft.EntityFrameworkCore;
using Shisha.Application.Abstractions;
using Shisha.Application.Users;
using Shisha.Domain.Entities;
using Shisha.Domain.Enums;
using Shisha.Domain.Exceptions;
using Shisha.Infrastructure.Persistence;

namespace Shisha.Infrastructure.Services;

public sealed class UserService(AppDbContext db, ICurrentUser currentUser, IPasswordHasher passwordHasher) : IUserService
{
    public async Task<IReadOnlyList<UserDto>> GetAllUsersAsync(CancellationToken ct = default)
    {
        return await db.Users
            .AsNoTracking()
            .OrderBy(u => u.FullName)
            .Select(u => new UserDto(u.Id, u.FullName, u.Email, u.Role.ToString(), u.MeasurerFixedFeeTjs))
            .ToListAsync(ct);
    }

    public async Task<UserDto> GetUserByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException($"User {userId} not found.");
        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.MeasurerFixedFeeTjs);
    }

    public async Task<IReadOnlyList<MeasurerDto>> GetMeasurersAsync(CancellationToken ct = default)
    {
        return await db.Users
            .AsNoTracking()
            .Where(u => u.Role == UserRole.Measurer && u.IsActive)
            .OrderBy(u => u.FullName)
            .Select(u => new MeasurerDto(u.Id, u.FullName, u.Email, u.MeasurerFixedFeeTjs))
            .ToListAsync(ct);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var role))
            throw new DomainValidationException("role", $"Unknown role '{request.Role}'.");

        if (role == UserRole.Measurer && request.MeasurerFixedFeeTjs is null)
            throw new DomainValidationException("measurerFixedFeeTjs", "Для замерщика необходимо указать ставку.");

        // Check email uniqueness (ignore soft-deleted users so the email can be reused)
        if (await db.Users.IgnoreQueryFilters()
                .AnyAsync(u => u.Email == request.Email && !u.IsDeleted, ct))
            throw new ConflictException($"Пользователь с email '{request.Email}' уже существует.");

        var user = new User
        {
            TenantId = currentUser.TenantId,
            Email = request.Email,
            PasswordHash = passwordHasher.Hash(request.Password),
            FullName = request.FullName,
            Role = role,
            MeasurerFixedFeeTjs = request.MeasurerFixedFeeTjs,
            IsActive = true,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return new UserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.MeasurerFixedFeeTjs);
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

    public async Task DeleteUserAsync(Guid userId, CancellationToken ct = default)
    {
        if (userId == currentUser.UserId)
            throw new DomainValidationException("userId", "Нельзя удалить собственный аккаунт.");

        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException($"User {userId} not found.");

        db.Remove(user);
        await db.SaveChangesAsync(ct);
    }
}
