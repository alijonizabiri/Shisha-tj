namespace Shisha.Application.Users;

public interface IUserService
{
    Task<IReadOnlyList<MeasurerDto>> GetMeasurersAsync(CancellationToken ct = default);
    Task<MeasurerDto> UpdateMeasurerFeeAsync(Guid userId, UpdateUserMeasurerFeeRequest request, CancellationToken ct = default);
}
