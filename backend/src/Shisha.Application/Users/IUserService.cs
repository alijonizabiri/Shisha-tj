namespace Shisha.Application.Users;

public interface IUserService
{
    Task<IReadOnlyList<MeasurerDto>> GetMeasurersAsync(CancellationToken ct = default);
}
