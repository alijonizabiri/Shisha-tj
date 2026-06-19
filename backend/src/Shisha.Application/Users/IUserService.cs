namespace Shisha.Application.Users;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllUsersAsync(CancellationToken ct = default);
    Task<UserDto> GetUserByIdAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<MeasurerDto>> GetMeasurersAsync(CancellationToken ct = default);
    Task<MeasurerDto> UpdateMeasurerFeeAsync(Guid userId, UpdateUserMeasurerFeeRequest request, CancellationToken ct = default);
}
